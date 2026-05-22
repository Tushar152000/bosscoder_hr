import Link from 'next/link';
import { Plus } from 'lucide-react';
import { requireUser } from '@/lib/auth/guard';
import { canManageCycles } from '@/lib/auth/review-access';
import { listCycles } from '@/lib/firestore/review-cycles';
import {
  listSubmissionsForCycle,
  listSubmissionsForReviewer,
  listSubmittedManagerEvalsForSubject,
  listManagerEvalsForSubject,
} from '@/lib/firestore/review-submissions';
import { getEmployeeByUserUid, listEmployees } from '@/lib/firestore/employees';
import { AdminBrowseSection, DrillSection, type DeptStat, type OrgStats } from '@/components/performance/browse-grid';
import { CyclesTable } from '@/components/performance/cycles-table';
import { EvalQueueSection } from '@/components/performance/eval-queue-section';
import type { ReportWithHistory } from '@/components/performance/my-team-rail';
import type { TeamMemberSummary } from '@/components/performance/team-ratings-list';
import {
  availableFYs,
  cycleFY,
  cycleMatchesPeriod,
  computeCycleDeadline,
  parseMonthParam,
  parseFYParam,
  parseStatusFilter,
} from '@/lib/performance/cycle-period';
import type { EmployeePublic } from '@/types/employee';
import type { ReviewCycle, ReviewSubmission } from '@/types/review';

export const metadata = { title: 'Performance evaluation' };

type AdminView =
  | { kind: 'tiles' }
  | { kind: 'all' }
  | { kind: 'team' }
  | { kind: 'dept'; name: string };

function parseAdminView(sp: { view?: string; name?: string } | undefined): AdminView {
  const view = sp?.view;
  if (view === 'all') return { kind: 'all' };
  if (view === 'team') return { kind: 'team' };
  if (view === 'dept' && sp?.name) return { kind: 'dept', name: sp.name };
  return { kind: 'tiles' };
}

interface Props {
  searchParams?: Promise<{
    view?: string;
    name?: string;
    fy?: string;
    month?: string;
    status?: string;
  }>;
}

export default async function PerformancePage({ searchParams }: Props) {
  const user = await requireUser();
  const isAdmin = canManageCycles(user);
  const isFounder = user.roles.includes('founder');
  const me = await getEmployeeByUserUid(user.uid);
  const sp = await searchParams;
  const adminView = isAdmin ? parseAdminView(sp) : ({ kind: 'tiles' } as AdminView);

  // Cycle section filters
  const filterFY     = parseFYParam(sp?.fy);
  const filterMonth  = parseMonthParam(sp?.month);
  const filterStatus = parseStatusFilter(sp?.status);

  const [cycles, mySubs, directReports, allEmployees, myMgrEvals] = await Promise.all([
    listCycles(),
    listSubmissionsForReviewer(user.email),
    me
      ? listEmployees({ managerId: me.employeeId, status: 'any', limit: 500 })
      : Promise.resolve([]),
    isAdmin
      ? listEmployees({ status: 'active', limit: 500 })
      : Promise.resolve([] as EmployeePublic[]),
    me
      ? listManagerEvalsForSubject(me.employeeId)
      : Promise.resolve([]),
  ]);

  // employeeId → displayName lookup for resolving manager names
  const empNameById = new Map<string, string>(
    allEmployees.map((e) => [e.employeeId, e.displayName]),
  );

  // Direct reports with rating history — for manager "My team" section
  const teamRows: TeamMemberSummary[] = await Promise.all(
    directReports.map(async (e) => ({
      employeeId: e.employeeId,
      displayName: e.displayName,
      email: e.email,
      designation: e.designation,
      department: e.department,
      managerName: e.managerId ? (empNameById.get(e.managerId) ?? null) : null,
      history: await listSubmittedManagerEvalsForSubject(e.employeeId),
    })),
  );

  // Department headcounts
  const deptCounts = new Map<string, number>();
  for (const e of allEmployees) {
    const dept = (e.department ?? '').trim() || 'Unassigned';
    deptCounts.set(dept, (deptCounts.get(dept) ?? 0) + 1);
  }
  const deptList = [...deptCounts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => a.name.localeCompare(b.name));

  // ── Admin browse stats ─────────────────────────────────────────────────────
  // Only computed on the tiles view; skipped when drilled in.
  let deptStats: DeptStat[] = [];
  let orgStats: OrgStats = { totalActive: 0, totalPending: 0, orgAvgRating: null, orgRatingDelta: null };
  let openCycleId: string | null = null;
  let openCycleName: string | null = null;
  let daysUntilClose: number | null = null;
  let lastClosedCycleName: string | null = null;
  let decliningCount = 0;
  let incompleteMgrCount = 0;
  const searchableEmployees: { employeeId: string; displayName: string; department: string }[] = [];

  if (isAdmin && adminView.kind === 'tiles') {
    const openCycle = cycles.find((c) => c.status === 'open') ?? null;
    const closedCycles = cycles
      .filter((c) => c.status === 'closed')
      .sort((a, b) => (b.closedAt?.getTime() ?? 0) - (a.closedAt?.getTime() ?? 0));

    const [openSubs, lastClosedSubs, prevClosedSubs] = await Promise.all([
      openCycle ? listSubmissionsForCycle(openCycle.cycleId) : Promise.resolve([]),
      closedCycles[0] ? listSubmissionsForCycle(closedCycles[0].cycleId) : Promise.resolve([]),
      closedCycles[1] ? listSubmissionsForCycle(closedCycles[1].cycleId) : Promise.resolve([]),
    ]);

    if (openCycle) {
      openCycleId = openCycle.cycleId;
      openCycleName = openCycle.name;
      const deadline = computeCycleDeadline(openCycle);
      if (deadline) daysUntilClose = Math.ceil((deadline.getTime() - Date.now()) / 864e5);
    }
    if (closedCycles[0]) lastClosedCycleName = closedCycles[0].name;

    // Dept manager lookup from managedDepartments field
    const deptManagerMap = new Map<string, string>();
    for (const emp of allEmployees) {
      for (const dept of emp.managedDepartments ?? []) {
        if (!deptManagerMap.has(dept)) deptManagerMap.set(dept, emp.displayName);
      }
    }

    // Pending counts per dept (self-evals only)
    const pendingByDept = new Map<string, number>();
    let totalPending = 0;
    for (const sub of openSubs) {
      if (sub.kind === 'self' && (sub.status === 'not-started' || sub.status === 'in-progress')) {
        const dept = (sub.subjectDepartment ?? '').trim() || 'Unassigned';
        pendingByDept.set(dept, (pendingByDept.get(dept) ?? 0) + 1);
        totalPending++;
      }
    }

    // Avg ratings by dept from last two closed cycles (manager evals only)
    const lastRatingsByDept = new Map<string, number[]>();
    const prevRatingsByDept = new Map<string, number[]>();
    for (const sub of lastClosedSubs) {
      if (sub.kind === 'manager' && sub.managerOverallRating != null) {
        const dept = (sub.subjectDepartment ?? '').trim() || 'Unassigned';
        const arr = lastRatingsByDept.get(dept) ?? [];
        arr.push(sub.managerOverallRating);
        lastRatingsByDept.set(dept, arr);
      }
    }
    for (const sub of prevClosedSubs) {
      if (sub.kind === 'manager' && sub.managerOverallRating != null) {
        const dept = (sub.subjectDepartment ?? '').trim() || 'Unassigned';
        const arr = prevRatingsByDept.get(dept) ?? [];
        arr.push(sub.managerOverallRating);
        prevRatingsByDept.set(dept, arr);
      }
    }

    const avg = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b) / arr.length : null;
    const round2 = (n: number) => Math.round(n * 100) / 100;

    deptStats = deptList.map(({ name, count }) => {
      const lastArr = lastRatingsByDept.get(name) ?? [];
      const prevArr = prevRatingsByDept.get(name) ?? [];
      const avgR = avg(lastArr);
      const prevAvgR = avg(prevArr);
      return {
        name,
        headcount: count,
        pendingCount: pendingByDept.get(name) ?? 0,
        avgRating: avgR != null ? round2(avgR) : null,
        ratingDelta: avgR != null && prevAvgR != null ? round2(avgR - prevAvgR) : null,
        managerName: deptManagerMap.get(name) ?? null,
      };
    });

    // Org-wide stats
    const allLastRatings = lastClosedSubs
      .filter((s) => s.kind === 'manager' && s.managerOverallRating != null)
      .map((s) => s.managerOverallRating!);
    const allPrevRatings = prevClosedSubs
      .filter((s) => s.kind === 'manager' && s.managerOverallRating != null)
      .map((s) => s.managerOverallRating!);
    const orgAvg = avg(allLastRatings);
    const prevOrgAvg = avg(allPrevRatings);
    orgStats = {
      totalActive: allEmployees.length,
      totalPending,
      orgAvgRating: orgAvg != null ? round2(orgAvg) : null,
      orgRatingDelta: orgAvg != null && prevOrgAvg != null ? round2(orgAvg - prevOrgAvg) : null,
    };

    // Declining employees (per-person: lastRating < prevRating - 0.2)
    const lastByEmp = new Map<string, number>();
    const prevByEmp = new Map<string, number>();
    for (const sub of lastClosedSubs) {
      if (sub.kind === 'manager' && sub.managerOverallRating != null)
        lastByEmp.set(sub.subjectEmployeeId, sub.managerOverallRating);
    }
    for (const sub of prevClosedSubs) {
      if (sub.kind === 'manager' && sub.managerOverallRating != null)
        prevByEmp.set(sub.subjectEmployeeId, sub.managerOverallRating);
    }
    for (const [empId, lastR] of lastByEmp) {
      const prevR = prevByEmp.get(empId);
      if (prevR != null && lastR < prevR - 0.2) decliningCount++;
    }

    // Managers with ≥1 incomplete manager-eval in the open cycle
    const incompleteMgrSet = new Set<string>();
    for (const sub of openSubs) {
      if (
        sub.kind === 'manager' &&
        (sub.status === 'not-started' || sub.status === 'in-progress') &&
        sub.reviewerEmployeeId
      ) {
        incompleteMgrSet.add(sub.reviewerEmployeeId);
      }
    }
    incompleteMgrCount = incompleteMgrSet.size;

    // Searchable employees list
    for (const e of allEmployees) {
      searchableEmployees.push({
        employeeId: e.employeeId,
        displayName: e.displayName,
        department: (e.department ?? '').trim() || 'Unassigned',
      });
    }
  }

  // ── Drill-in data (admin navigated into a group) ───────────────────────────
  let drillRows: TeamMemberSummary[] = [];
  let drillTitle = '';
  let drillSubtitle = '';
  if (isAdmin && adminView.kind !== 'tiles') {
    let subjects: EmployeePublic[] = [];
    if (adminView.kind === 'all') {
      subjects = allEmployees;
      drillTitle = 'All employees';
      drillSubtitle = `${subjects.length} active`;
    } else if (adminView.kind === 'team') {
      subjects = directReports;
      drillTitle = 'Direct reports';
      drillSubtitle = `${subjects.length} ${subjects.length === 1 ? 'person' : 'people'}`;
    } else {
      subjects = allEmployees.filter(
        (e) => ((e.department ?? '').trim() || 'Unassigned') === adminView.name,
      );
      drillTitle = adminView.name;
      drillSubtitle = `${subjects.length} ${subjects.length === 1 ? 'person' : 'people'}`;
    }
    drillRows = await Promise.all(
      subjects.map(async (e) => ({
        employeeId: e.employeeId,
        displayName: e.displayName,
        email: e.email,
        designation: e.designation,
        department: e.department,
        managerName: e.managerId ? (empNameById.get(e.managerId) ?? null) : null,
        history: await listSubmittedManagerEvalsForSubject(e.employeeId),
      })),
    );
  }

  const cyclesById: Record<string, ReviewCycle> = {};
  for (const c of cycles) cyclesById[c.cycleId] = c;

  // Build cycleId → manager-eval map (all statuses) for the current user as subject
  const mgrEvalByCycle: Record<string, ReviewSubmission> = {};
  for (const e of myMgrEvals) {
    mgrEvalByCycle[e.cycleId] = e;
  }

  // Build cycleId → previous cycle's manager rating (for delta in SubmittedCard)
  const prevRatingByCycle: Record<string, number | null> = {};
  const submittedMgrEvals = myMgrEvals
    .filter((e) => e.status === 'submitted' || e.status === 'locked')
    .sort((a, b) => ((a.submittedAt ?? a.createdAt)?.getTime() ?? 0) - ((b.submittedAt ?? b.createdAt)?.getTime() ?? 0));
  for (let i = 1; i < submittedMgrEvals.length; i++) {
    prevRatingByCycle[submittedMgrEvals[i].cycleId] = submittedMgrEvals[i - 1].managerOverallRating;
  }

  // Enrich teamRows with pending manager-evals from mySubs so the rail can show them
  const hasReports = teamRows.length > 0;
  const reportsWithHistory: ReportWithHistory[] = teamRows.map((row) => ({
    ...row,
    pendingSubs: mySubs.filter(
      (s) =>
        s.kind === 'manager' &&
        s.subjectEmployeeId === row.employeeId &&
        (s.status === 'not-started' || s.status === 'in-progress'),
    ),
  }));

  const queueSubs = isFounder ? mySubs.filter((s) => s.kind !== 'self') : mySubs;

  // Build FY options + apply FY / month / status filters
  const fyOptions = availableFYs(cycles);
  const filteredCycles = cycles.filter((c) => {
    if (filterFY     != null && cycleFY(c) !== filterFY)              return false;
    if (filterMonth  != null && !cycleMatchesPeriod(c, null, filterMonth)) return false;
    if (filterStatus != null && c.status !== filterStatus)            return false;
    return true;
  });

  return (
    <div className="px-4 py-6 space-y-6">
      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3.5">
        <div>
          <h1 className="text-[20px] font-medium text-slate-900">Performance evaluation</h1>
          <p className="mt-1 text-[12px] text-slate-500">
            Track and submit evaluation forms across cycles.
          </p>
        </div>
        {isAdmin && (
          <Link
            href="/performance/cycles/new"
            className="inline-flex items-center gap-1.5 bg-brand text-white rounded-lg px-3.5 py-2 text-[13px] font-medium hover:bg-brand-hover transition"
          >
            <Plus className="h-3.5 w-3.5" />
            New cycle
          </Link>
        )}
      </div>

      {/* ── Admin browse / drill (above the queue grid) ──────────── */}
      {isAdmin && adminView.kind === 'tiles' && (
        <AdminBrowseSection
          deptStats={deptStats}
          orgStats={orgStats}
          openCycleId={openCycleId}
          openCycleName={openCycleName}
          daysUntilClose={daysUntilClose}
          lastClosedCycleName={lastClosedCycleName}
          decliningCount={decliningCount}
          incompleteMgrCount={incompleteMgrCount}
          searchableEmployees={searchableEmployees}
        />
      )}
      {isAdmin && adminView.kind !== 'tiles' && (
        <DrillSection title={drillTitle} subtitle={drillSubtitle} rows={drillRows} />
      )}

      {/* ── Eval queue toggle (self / team) ─────────────────────── */}
      {(queueSubs.length > 0 || hasReports) && (
        <EvalQueueSection
          submissions={queueSubs}
          cyclesById={cyclesById}
          reportsWithHistory={reportsWithHistory}
          mgrEvalByCycle={mgrEvalByCycle}
          prevRatingByCycle={prevRatingByCycle}
        />
      )}

      {/* ── Cycles table (tiles view only) ──────────────────────── */}
      {isAdmin && adminView.kind === 'tiles' && (
        <CyclesTable
          cycles={filteredCycles}
          allCount={cycles.length}
          fyOptions={fyOptions}
          fy={filterFY}
          month={filterMonth}
          statusParam={sp?.status ?? null}
          view={sp?.view ?? null}
          viewName={sp?.name ?? null}
        />
      )}
    </div>
  );
}
