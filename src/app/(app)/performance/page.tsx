import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CalendarCheck,
  CalendarClock,
  CalendarX,
  Plus,
  Users,
  UsersRound,
} from 'lucide-react';
import { requireUser } from '@/lib/auth/guard';
import { canManageCycles } from '@/lib/auth/review-access';
import { listCycles } from '@/lib/firestore/review-cycles';
import {
  listSubmissionsForReviewer,
  listSubmittedManagerEvalsForSubject,
} from '@/lib/firestore/review-submissions';
import {
  getEmployeeByUserUid,
  listEmployees,
} from '@/lib/firestore/employees';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatCard } from '@/components/performance/stat-card';
import { RatingChart, type RatingPoint } from '@/components/performance/rating-chart';
import {
  TeamRatingsList,
  type TeamMemberSummary,
} from '@/components/performance/team-ratings-list';
import { MyFormsTabs } from '@/components/performance/my-forms-tabs';
import { CycleFilterBar } from '@/components/performance/cycle-filter-bar';
import { formatDate } from '@/lib/format';
import {
  availableYears,
  cycleMatchesPeriod,
  parseMonthParam,
  parseYearParam,
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
    year?: string;
    month?: string;
  }>;
}

export default async function PerformancePage({ searchParams }: Props) {
  const user = await requireUser();
  const isAdmin = canManageCycles(user);
  const me = await getEmployeeByUserUid(user.uid);
  const sp = await searchParams;
  const adminView = isAdmin ? parseAdminView(sp) : ({ kind: 'tiles' } as AdminView);
  const filterYear = parseYearParam(sp?.year);
  const filterMonth = parseMonthParam(sp?.month);

  // ─── Load everything in parallel — single roundtrip per data source. ───
  const [cycles, mySubs, myHistory, directReports, allEmployees] = await Promise.all([
    listCycles(),
    listSubmissionsForReviewer(user.email),
    me ? listSubmittedManagerEvalsForSubject(me.employeeId) : Promise.resolve([] as ReviewSubmission[]),
    me
      ? listEmployees({ managerId: me.employeeId, status: 'any', limit: 500 })
      : Promise.resolve([]),
    isAdmin
      ? listEmployees({ status: 'active', limit: 500 })
      : Promise.resolve([] as EmployeePublic[]),
  ]);

  // For each direct report, load their rating history (in parallel).
  const teamRows: TeamMemberSummary[] = await Promise.all(
    directReports.map(async (e) => ({
      employeeId: e.employeeId,
      displayName: e.displayName,
      email: e.email,
      designation: e.designation,
      department: e.department,
      history: await listSubmittedManagerEvalsForSubject(e.employeeId),
    }))
  );

  // Department headcounts — used to render the tiles for founders/HR.
  const deptCounts = new Map<string, number>();
  for (const e of allEmployees) {
    const dept = (e.department ?? '').trim() || 'Unassigned';
    deptCounts.set(dept, (deptCounts.get(dept) ?? 0) + 1);
  }
  const deptList = [...deptCounts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => a.name.localeCompare(b.name));

  // Only fetch per-employee rating history for the *active* drill-in view —
  // skipping this for the tile grid keeps founders' default landing fast.
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
        (e) => ((e.department ?? '').trim() || 'Unassigned') === adminView.name
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
        history: await listSubmittedManagerEvalsForSubject(e.employeeId),
      }))
    );
  }

  // ─── Cycle lookup map (for deadline computation in the forms tabs) ────
  const cyclesById: Record<string, ReviewCycle> = {};
  for (const c of cycles) cyclesById[c.cycleId] = c;

  // ─── Year/Month filter ────────────────────────────────────────────────
  // Two filter bars (admin: Cycles section; non-admin: above MyFormsTabs)
  // share one URL state. Each scopes locally to the section it's next to:
  //  - Admin's filter → filteredCycles only (forms stay full).
  //  - Non-admin's filter → filteredMySubs only (admin's forms stay full).
  const yearOptions = availableYears(cycles);
  const filteredCycles = cycles.filter((c) =>
    cycleMatchesPeriod(c, filterYear, filterMonth)
  );
  const filteredCycleIds = new Set(filteredCycles.map((c) => c.cycleId));
  const filterIsActive = filterYear != null || filterMonth != null;
  const filteredMySubs =
    !filterIsActive ? mySubs : mySubs.filter((s) => filteredCycleIds.has(s.cycleId));

  // ─── My personal rating stats ─────────────────────────────────────────
  const myRatings = myHistory
    .map((s) => s.managerOverallRating)
    .filter((r): r is number => typeof r === 'number');
  const lastRating = myRatings[myRatings.length - 1] ?? null;
  const avgQuarterly = avg(myRatings.slice(-3));
  const avgFy = avg(myRatings);
  const myChartData: RatingPoint[] = myHistory.map((s) => ({
    label: shortCycleLabel(s.cycleName),
    rating: s.managerOverallRating ?? null,
  }));

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button asChild variant="outline" size="sm">
            <Link href="/">
              <ArrowLeft className="h-4 w-4" />
              Home
            </Link>
          </Button>
          <h1 className="text-2xl font-semibold text-white">Performance evaluation</h1>
        </div>
        {isAdmin && (
          <Button asChild size="sm">
            <Link href="/performance/cycles/new">
              <Plus className="h-4 w-4" />
              New cycle
            </Link>
          </Button>
        )}
      </div>

      {/* ─── 1. My forms — tabs + tile grid (urgency color-coded) ───── */}
      {!isAdmin && cycles.length > 0 && (
        <CycleFilterBar
          years={yearOptions}
          matchedCycleCount={filteredCycles.length}
          totalCycleCount={cycles.length}
        />
      )}
      <MyFormsTabs
        submissions={isAdmin ? mySubs : filteredMySubs}
        cyclesById={cyclesById}
      />

      {/* ─── 2a. Non-admin: My team — direct reports + trends ───────── */}
      {!isAdmin && teamRows.length > 0 && (
        <section className="space-y-3">
          <div>
            <h2 className="text-base font-semibold text-white">My team</h2>
            <p className="mt-0.5 text-xs text-muted">
              Click a person to see their rating trend and recent evaluations.
            </p>
          </div>
          <TeamRatingsList rows={teamRows} />
        </section>
      )}

      {/* ─── 2b. Admin: tile grid (or drilled-in list) ─────────────── */}
      {isAdmin && adminView.kind === 'tiles' && (
        <AdminTilesSection
          deptList={deptList}
          allCount={allEmployees.length}
          directCount={directReports.length}
        />
      )}
      {isAdmin && adminView.kind !== 'tiles' && (
        <AdminDrillSection
          title={drillTitle}
          subtitle={drillSubtitle}
          rows={drillRows}
        />
      )}

      {/* ─── 3. My performance — chart + stats from manager-evals of me ── */}
      {me && (
        <section className="space-y-3">
          <h2 className="text-base font-semibold text-white">My performance</h2>
          <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
            <div className="rounded-xl border border-default bg-card p-5">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs font-medium uppercase tracking-wider text-muted">
                  Rating trend
                </p>
                <div className="flex items-center gap-3 text-xs text-muted">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-3 rounded-sm bg-accent-500" />
                    Monthly rating
                  </span>
                  {avgFy != null && (
                    <span className="flex items-center gap-1.5">
                      <span className="h-px w-3 border-t-2 border-dashed border-emerald-400" />
                      Average
                    </span>
                  )}
                </div>
              </div>
              <RatingChart data={myChartData} averageLine={avgFy} height={260} />
            </div>
            <div className="space-y-3">
              <StatCard
                label="Latest rating"
                value={lastRating != null ? lastRating.toFixed(1) : '—'}
                unit={lastRating != null ? '/5' : undefined}
                hint={
                  lastRating != null && myHistory[myHistory.length - 1]
                    ? myHistory[myHistory.length - 1].cycleName
                    : 'No submissions yet'
                }
              />
              <StatCard
                label="Avg (last 3)"
                value={avgQuarterly != null ? avgQuarterly.toFixed(1) : '—'}
                unit={avgQuarterly != null ? '/5' : undefined}
                hint="Most recent 3 cycles"
              />
              <StatCard
                label="Avg (all-time)"
                value={avgFy != null ? avgFy.toFixed(1) : '—'}
                unit={avgFy != null ? '/5' : undefined}
                hint={`Across ${myRatings.length} ${myRatings.length === 1 ? 'cycle' : 'cycles'}`}
              />
            </div>
          </div>

        </section>
      )}

      {/* ─── 4. Admin: cycle list ─────────────────────────────────────── */}
      {isAdmin && (
        <section className="space-y-3">
          <div>
            <h2 className="text-base font-semibold text-white">Cycles</h2>
            <p className="mt-0.5 text-xs text-muted">
              Open or close evaluation cycles. Opening a cycle assigns forms to
              every active employee + their manager.
            </p>
          </div>
          <CycleFilterBar
            years={yearOptions}
            matchedCycleCount={filteredCycles.length}
            totalCycleCount={cycles.length}
          />
          <CyclesAdminTiles cycles={filteredCycles} />
        </section>
      )}
    </div>
  );
}

function AdminTilesSection({
  deptList,
  allCount,
  directCount,
}: {
  deptList: { name: string; count: number }[];
  allCount: number;
  directCount: number;
}) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-base font-semibold text-white">Browse employees</h2>
        <p className="mt-0.5 text-xs text-muted">
          Pick a department to see its members and rating trends, or jump to
          everyone or your direct reports.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Tile
          href="/performance?view=all"
          icon={<Users className="h-5 w-5" />}
          title="All employees"
          subtitle={`${allCount} active`}
          tone="accent"
        />
        <Tile
          href="/performance?view=team"
          icon={<UsersRound className="h-5 w-5" />}
          title="Direct reports"
          subtitle={`${directCount} ${directCount === 1 ? 'person' : 'people'}`}
          tone="accent"
          disabled={directCount === 0}
        />
        {deptList.map((d) => (
          <Tile
            key={d.name}
            href={`/performance?view=dept&name=${encodeURIComponent(d.name)}`}
            icon={<Building2 className="h-5 w-5" />}
            title={d.name}
            subtitle={`${d.count} ${d.count === 1 ? 'person' : 'people'}`}
          />
        ))}
      </div>
    </section>
  );
}

function Tile({
  href,
  icon,
  title,
  subtitle,
  tone,
  disabled,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  tone?: 'accent';
  disabled?: boolean;
}) {
  const ringCls =
    tone === 'accent'
      ? 'ring-1 ring-accent-500/30 hover:ring-accent-500/50'
      : 'hover:border-white/20';
  const iconCls =
    tone === 'accent'
      ? 'bg-accent-500/15 text-accent-200 ring-1 ring-accent-500/30'
      : 'bg-white/5 text-muted ring-1 ring-white/10';
  if (disabled) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-default bg-card p-4 opacity-50">
        <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg ${iconCls}`}>
          {icon}
        </div>
        <div className="min-w-0">
          <div className="truncate text-sm font-medium text-white">{title}</div>
          <div className="truncate text-xs text-muted">{subtitle}</div>
        </div>
      </div>
    );
  }
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 rounded-xl border border-default bg-card p-4 transition-colors hover:bg-white/[0.02] ${ringCls}`}
    >
      <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg ${iconCls}`}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-white">{title}</div>
        <div className="truncate text-xs text-muted">{subtitle}</div>
      </div>
      <ArrowRight className="h-4 w-4 shrink-0 text-muted" />
    </Link>
  );
}

function AdminDrillSection({
  title,
  subtitle,
  rows,
}: {
  title: string;
  subtitle: string;
  rows: TeamMemberSummary[];
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <Link
            href="/performance"
            className="inline-flex items-center gap-1 text-xs text-muted hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to departments
          </Link>
          <h2 className="mt-1 text-base font-semibold text-white">{title}</h2>
          <p className="mt-0.5 text-xs text-muted">{subtitle}</p>
        </div>
      </div>
      {rows.length === 0 ? (
        <div className="rounded-xl border border-default bg-card p-5 text-sm text-muted">
          No employees here yet.
        </div>
      ) : (
        <TeamRatingsList rows={rows} />
      )}
    </section>
  );
}

function CyclesAdminTiles({ cycles }: { cycles: ReviewCycle[] }) {
  if (cycles.length === 0) {
    return (
      <div className="rounded-xl border border-default bg-card p-5 text-sm text-muted">
        No cycles yet.{' '}
        <Link href="/performance/cycles/new" className="text-accent-300 hover:underline">
          Create the first one →
        </Link>
      </div>
    );
  }
  // Open cycles first, then drafts, then closed — most relevant on top.
  const order = { open: 0, draft: 1, closed: 2 } as const;
  const sorted = [...cycles].sort((a, b) => order[a.status] - order[b.status]);
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {sorted.map((c) => (
        <CycleTile key={c.cycleId} cycle={c} />
      ))}
      <Link
        href="/performance/cycles/new"
        className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-default bg-card/40 p-4 text-sm text-muted transition-colors hover:border-white/20 hover:bg-white/[0.03] hover:text-white"
      >
        <Plus className="h-4 w-4" />
        New cycle
      </Link>
    </div>
  );
}

function CycleTile({ cycle: c }: { cycle: ReviewCycle }) {
  const Icon =
    c.status === 'open'
      ? CalendarCheck
      : c.status === 'closed'
      ? CalendarX
      : CalendarClock;
  const iconCls =
    c.status === 'open'
      ? 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30'
      : c.status === 'closed'
      ? 'bg-white/5 text-muted ring-1 ring-white/10'
      : 'bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/30';

  const dateLine =
    c.status === 'open' && c.openedAt
      ? `Open since ${formatDate(c.openedAt)}`
      : c.status === 'closed' && c.closedAt
      ? `Closed ${formatDate(c.closedAt)}`
      : 'Draft — not opened yet';

  return (
    <Link
      href={`/performance/cycles/${c.cycleId}`}
      className="group flex flex-col gap-3 rounded-xl border border-default bg-card p-4 transition-colors hover:border-white/20 hover:bg-white/[0.02]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg ${iconCls}`}>
          <Icon className="h-5 w-5" />
        </div>
        <CycleStatusPill status={c.status} />
      </div>
      <div className="min-w-0">
        <div className="truncate text-sm font-medium text-white">{c.name}</div>
        <div className="mt-0.5 truncate text-xs text-muted">
          {c.cadence === 'monthly' ? 'Monthly' : 'Quarterly'} · {dateLine}
        </div>
      </div>
      {c.status === 'open' ? (
        <div className="space-y-1.5">
          <ProgressRow label="Self" submitted={c.selfSubmittedCount} total={c.selfCount} />
          <ProgressRow label="Manager" submitted={c.managerSubmittedCount} total={c.managerCount} />
        </div>
      ) : (
        <div className="flex items-center justify-end text-xs text-muted">
          <span className="inline-flex items-center gap-1 group-hover:text-white">
            View details
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </span>
        </div>
      )}
    </Link>
  );
}

function ProgressRow({
  label,
  submitted,
  total,
}: {
  label: string;
  submitted: number;
  total: number;
}) {
  const pct = total > 0 ? Math.min(100, Math.round((submitted / total) * 100)) : 0;
  return (
    <div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted">{label}</span>
        <span className="tabular-nums text-white">
          {submitted}/{total}
          <span className="ml-1 text-muted">({pct}%)</span>
        </span>
      </div>
      <div className="mt-1 h-1 overflow-hidden rounded-full bg-white/[0.06]">
        <div
          className="h-full bg-accent-500 transition-[width] duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function CycleStatusPill({ status }: { status: ReviewCycle['status'] }) {
  if (status === 'open') return <Badge variant="success">Open</Badge>;
  if (status === 'closed') return <Badge variant="muted">Closed</Badge>;
  return <Badge variant="warning">Draft</Badge>;
}

function avg(xs: number[]): number | null {
  if (xs.length === 0) return null;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

const MONTHS_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];
const MONTHS_LONG = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function shortCycleLabel(cycleName: string): string {
  const m = MONTHS_LONG.find((mm) => cycleName.startsWith(mm));
  if (m) {
    const idx = MONTHS_LONG.indexOf(m);
    const yr = cycleName.slice(m.length).trim().slice(-2);
    return `${MONTHS_SHORT[idx]} ${yr}`;
  }
  const q = /^Q(\d)\s+(\d{4})$/.exec(cycleName);
  if (q) return `Q${q[1]} ${q[2].slice(-2)}`;
  return cycleName;
}
