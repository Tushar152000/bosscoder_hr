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
import { AdminBrowseSection, DrillSection, ALL_EMPLOYEES, type DeptStat, type OrgStats } from '@/components/performance/browse-grid';
import { CyclesTable } from '@/components/performance/cycles-table';
import { EvalQueueSection } from '@/components/performance/eval-queue-section';
import { AdminPerformanceTabs } from '@/components/performance/admin-performance-tabs';
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
import { PerformanceComingSoonPopup } from '@/components/performance/coming-soon-popup';

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

  // Detect open cycle early — needed for both tiles and drill views
  const openCycle = cycles.find((c) => c.status === 'open') ?? null;

  // Self-eval status lookup for manager-eval cards. More than one cycle can be
  // open at once, so gather self-evals from EVERY open cycle and key them by
  // `${cycleId}::${subjectEmployeeId}`. Keying by subject alone would let one
  // cycle's status leak onto another cycle's card — or, if the wrong open cycle
  // is picked, make every card's self-eval status go missing (cards then read
  // "Awaiting self-eval" even after the report submitted their self-evaluation).
  const openCycles = cycles.filter((c) => c.status === 'open');
  const openCyclesSubs = (
    await Promise.all(openCycles.map((c) => listSubmissionsForCycle(c.cycleId)))
  ).flat();
  const selfEvalStatusById: Record<string, string> = {};
  for (const s of openCyclesSubs) {
    if (s.kind === 'self') selfEvalStatusById[`${s.cycleId}::${s.subjectEmployeeId}`] = s.status;
  }

  // employeeId → displayName lookup for resolving manager names
  const empNameById = new Map<string, string>(
    allEmployees.map((e) => [e.employeeId, e.displayName]),
  );

  // Direct reports with rating history — for manager "My team" section
  const teamRows: TeamMemberSummary[] = await Promise.all(
    directReports.map(async (e) => {
      const managerSub = mySubs.find(
        (s) =>
          s.kind === 'manager' &&
          s.subjectEmployeeId === e.employeeId &&
          openCycle &&
          s.cycleId === openCycle.cycleId,
      ) ?? null;
      return {
        employeeId: e.employeeId,
        displayName: e.displayName,
        email: e.email,
        designation: e.designation,
        department: e.department,
        managerName: e.managerId ? (empNameById.get(e.managerId) ?? null) : null,
        history: await listSubmittedManagerEvalsForSubject(e.employeeId),
        openCycleEval: openCycle
          ? {
              cycleName: openCycle.name,
              selfStatus: null, // self-eval status not fetched for teamRows (use drill view for that)
              managerSubId: managerSub?.submissionId ?? null,
              managerStatus: managerSub?.status ?? null,
            }
          : null,
      };
    }),
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

  let deptStats: DeptStat[] = [];
  let orgStats: OrgStats = { totalActive: 0, totalPending: 0, orgAvgRating: null, orgRatingDelta: null };
  let openCycleId: string | null = openCycle?.cycleId ?? null;
  let openCycleName: string | null = openCycle?.name ?? null;
  let daysUntilClose: number | null = null;
  let lastClosedCycleName: string | null = null;
  let decliningCount = 0;
  let incompleteMgrCount = 0;
  const searchableEmployees: { employeeId: string; displayName: string; department: string }[] = [];

  if (isAdmin && adminView.kind === 'tiles') {
    const closedCycles = cycles
      .filter((c) => c.status === 'closed')
      .sort((a, b) => (b.closedAt?.getTime() ?? 0) - (a.closedAt?.getTime() ?? 0));

    const [openSubs, lastClosedSubs, prevClosedSubs] = await Promise.all([
      openCycle ? listSubmissionsForCycle(openCycle.cycleId) : Promise.resolve([]),
      closedCycles[0] ? listSubmissionsForCycle(closedCycles[0].cycleId) : Promise.resolve([]),
      closedCycles[1] ? listSubmissionsForCycle(closedCycles[1].cycleId) : Promise.resolve([]),
    ]);

    if (openCycle) {
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

    // Fetch open cycle subs once for the whole drill view
    const drillOpenSubs = openCycle
      ? await listSubmissionsForCycle(openCycle.cycleId)
      : [];

    drillRows = await Promise.all(
      subjects.map(async (e) => {
        const selfSub = drillOpenSubs.find(
          (s) => s.kind === 'self' && s.subjectEmployeeId === e.employeeId,
        ) ?? null;
        const managerSub = drillOpenSubs.find(
          (s) => s.kind === 'manager' && s.subjectEmployeeId === e.employeeId,
        ) ?? null;
        return {
          employeeId: e.employeeId,
          displayName: e.displayName,
          email: e.email,
          designation: e.designation,
          department: e.department,
          managerName: e.managerId ? (empNameById.get(e.managerId) ?? null) : null,
          history: await listSubmittedManagerEvalsForSubject(e.employeeId),
          openCycleEval: openCycle
            ? {
                cycleName: openCycle.name,
                selfStatus: selfSub?.status ?? null,
                managerSubId: managerSub?.submissionId ?? null,
                managerStatus: managerSub?.status ?? null,
              }
            : null,
        };
      }),
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

  // Admin's own self-eval is shown in a dedicated top-level section, not inside dept drill-down
  const mySelfSubs = mySubs.filter((s) => s.kind === 'self');
  const managerSubs = mySubs.filter((s) => s.kind !== 'self');
  const isOpenStatus = (s: ReviewSubmission) =>
    s.status === 'not-started' || s.status === 'in-progress';
  // Founders: only manager evals where the subject's self-eval is submitted (no "pending" noise)
  // Admins: manager evals only (self-eval shown separately above)
  // Regular employees: all their submissions including their own self-eval
  const queueSubs = isFounder
    ? managerSubs.filter((s) => {
        const selfStatus = selfEvalStatusById[`${s.cycleId}::${s.subjectEmployeeId}`];
        return selfStatus === 'submitted' || selfStatus === 'locked';
      })
    : isAdmin
    ? managerSubs
    : mySubs;

  // Build FY options + apply FY / month / status filters
  const fyOptions = availableFYs(cycles);
  const filteredCycles = cycles.filter((c) => {
    if (filterFY     != null && cycleFY(c) !== filterFY)              return false;
    if (filterMonth  != null && !cycleMatchesPeriod(c, null, filterMonth)) return false;
    if (filterStatus != null && c.status !== filterStatus)            return false;
    return true;
  });

  const showComingSoon = !isAdmin && queueSubs.length === 0 && !hasReports;

  return (
    <div className="px-6 md:px-10 py-6 space-y-6">
      {showComingSoon && <PerformanceComingSoonPopup />}
      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3.5">
        <div>
          <h1 className="text-[20px] font-medium text-slate-900">Performance evaluation</h1>
          <p className="mt-1 text-[12px] text-slate-500">
            Track and submit evaluation forms across cycles.
          </p>
        </div>
        {isAdmin && !isFounder && (
          <Link
            href="/performance/cycles/new"
            className="inline-flex items-center gap-1.5 bg-brand text-white rounded-lg px-3.5 py-2 text-[13px] font-medium hover:bg-brand-hover transition"
          >
            <Plus className="h-3.5 w-3.5" />
            New cycle
          </Link>
        )}
      </div>


      {isAdmin && adminView.kind === 'tiles' && (() => {
        // Landing page: one toggle —
        // Evaluation cycles · Departments (grid) · My evaluations · Team evaluations.
        const selfSubs = isFounder ? [] : mySelfSubs;
        const hasTeam = queueSubs.length > 0 || reportsWithHistory.length > 0;
        return (
          <AdminPerformanceTabs
            myOpenCount={selfSubs.filter(isOpenStatus).length}
            teamOpenCount={queueSubs.filter(isOpenStatus).length}
            cycles={
              <CyclesTable
                cycles={filteredCycles}
                fyOptions={fyOptions}
                fy={filterFY}
                statusParam={sp?.status ?? null}
                view={sp?.view ?? null}
                viewName={sp?.name ?? null}
                canCreate={!isFounder}
              />
            }
            departments={
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
                isFounder={isFounder}
              />
            }
            myEvaluations={
              selfSubs.length > 0 ? (
                <EvalQueueSection
                  submissions={selfSubs}
                  cyclesById={cyclesById}
                  reportsWithHistory={[]}
                  mgrEvalByCycle={mgrEvalByCycle}
                  prevRatingByCycle={prevRatingByCycle}
                  forcedView="self"
                />
              ) : null
            }
            teamEvaluations={
              hasTeam ? (
                <EvalQueueSection
                  submissions={queueSubs}
                  cyclesById={cyclesById}
                  reportsWithHistory={reportsWithHistory}
                  mgrEvalByCycle={mgrEvalByCycle}
                  prevRatingByCycle={prevRatingByCycle}
                  selfEvalStatusById={selfEvalStatusById}
                  forcedView="manager"
                />
              ) : null
            }
          />
        );
      })()}

      {isAdmin && adminView.kind !== 'tiles' && (
        <>
          <DrillSection
            title={drillTitle}
            subtitle={drillSubtitle}
            rows={drillRows}
            departments={deptList.map((d) => d.name)}
            current={adminView.kind === 'dept' ? adminView.name : ALL_EMPLOYEES}
          />
          {(() => {
            // Inside a department drill-down: scope the eval queue to that department,
            // keeping the My / Team sub-toggle.
            const deptName = adminView.kind === 'dept' ? adminView.name : null;
            const scopedSubs = deptName
              ? queueSubs.filter((s) => s.subjectDepartment === deptName)
              : queueSubs;
            const scopedReports = deptName
              ? reportsWithHistory.filter((r) => ((r.department ?? '').trim() || 'Unassigned') === deptName)
              : reportsWithHistory;
            const selfSubs = isFounder ? [] : mySelfSubs;
            const combinedSubs = [...selfSubs, ...scopedSubs];
            return (combinedSubs.length > 0 || scopedReports.length > 0) ? (
              <EvalQueueSection
                submissions={combinedSubs}
                cyclesById={cyclesById}
                reportsWithHistory={scopedReports}
                mgrEvalByCycle={mgrEvalByCycle}
                prevRatingByCycle={prevRatingByCycle}
                selfEvalStatusById={selfEvalStatusById}
              />
            ) : null;
          })()}
        </>
      )}

      {!isAdmin && (queueSubs.length > 0 || hasReports) && (
        // Non-admins: always show their own eval queue (with its built-in My / Team toggle)
        <EvalQueueSection
          submissions={queueSubs}
          cyclesById={cyclesById}
          reportsWithHistory={reportsWithHistory}
          mgrEvalByCycle={mgrEvalByCycle}
          prevRatingByCycle={prevRatingByCycle}
          selfEvalStatusById={selfEvalStatusById}
        />
      )}
    </div>
  );
}
