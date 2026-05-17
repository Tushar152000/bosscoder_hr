import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { requireUser } from '@/lib/auth/guard';
import { canManageCycles } from '@/lib/auth/review-access';
import { getEmployeeByUserUid } from '@/lib/firestore/employees';
import { getCycle } from '@/lib/firestore/review-cycles';
import { listSubmissionsForCycle } from '@/lib/firestore/review-submissions';
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ManagerRatingTable } from '@/components/performance/manager-rating-table';
import { TeamMemberCard, type TeamPair } from '@/components/performance/team-member-card';
import { YourSelfEvalCard } from '@/components/performance/your-self-eval-card';
import {
  CloseCycleButton,
  OpenCycleButton,
  SyncEmployeesButton,
} from '@/components/performance/cycle-actions';
import { DEPARTMENTS } from '@/lib/constants/departments';
import { formatDate } from '@/lib/format';
import type { ReviewSubmission, SubmissionStatus } from '@/types/review';

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const c = await getCycle(id);
  return { title: c ? `${c.name} — Performance` : 'Cycle' };
}

export default async function CycleDetailPage({ params }: Props) {
  const user = await requireUser();
  const { id } = await params;
  const cycle = await getCycle(id);
  if (!cycle) notFound();

  const isAdmin = canManageCycles(user);
  const me = await getEmployeeByUserUid(user.uid);
  const myEmail = user.email.toLowerCase();
  const isReviewer = (s: ReviewSubmission) =>
    (s.reviewerUid && s.reviewerUid === user.uid) ||
    (!!s.reviewerEmail && s.reviewerEmail.toLowerCase() === myEmail);

  const allSubs = await listSubmissionsForCycle(cycle.cycleId);

  // 1. The user's OWN self-evaluation (if any).
  const mySelfEval =
    allSubs.find((s) => s.kind === 'self' && isReviewer(s)) ??
    null;

  // 2. The user's team — pair each manager-eval (where I'm reviewer) with the
  //    matching self-eval of that subject.
  const myManagerEvals = allSubs
    .filter((s) => s.kind === 'manager' && isReviewer(s))
    .sort((a, b) => a.subjectName.localeCompare(b.subjectName));

  const teamPairs: TeamPair[] = myManagerEvals.map((mEval) => ({
    managerEval: mEval,
    selfEval:
      allSubs.find(
        (s) => s.kind === 'self' && s.subjectEmployeeId === mEval.subjectEmployeeId
      ) ?? null,
  }));

  // 3. Department-lead browse (admins + anyone with managedDepartments).
  const myManagedDepts = me?.managedDepartments ?? [];
  const showDeptBrowse = isAdmin || myManagedDepts.length > 0;
  const allSelfEvals = allSubs.filter((s) => s.kind === 'self');
  const deptScopedSelfEvals = isAdmin
    ? allSelfEvals
    : allSelfEvals.filter((s) => myManagedDepts.includes(s.subjectDepartment));

  // 4. Manager rating aggregate table (admins + dept-leads).
  const allManagerEvals = allSubs.filter((s) => s.kind === 'manager');
  const tableScopedManagerEvals = isAdmin
    ? allManagerEvals
    : allManagerEvals.filter((s) => myManagedDepts.includes(s.subjectDepartment));
  const showManagerTable = (isAdmin || myManagedDepts.length > 0) && tableScopedManagerEvals.length > 0;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/performance"
          className="inline-flex items-center gap-1 text-sm text-muted hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to performance
        </Link>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">{cycle.name}</h1>
            <p className="mt-1 text-sm text-muted">
              {cycle.cadence === 'monthly' ? 'Monthly' : 'Quarterly'} ·{' '}
              <CycleStatusText cycle={cycle} />
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && cycle.status === 'draft' && <OpenCycleButton cycleId={cycle.cycleId} />}
            {isAdmin && cycle.status === 'open' && (
              <>
                <SyncEmployeesButton cycleId={cycle.cycleId} />
                <CloseCycleButton cycleId={cycle.cycleId} />
              </>
            )}
          </div>
        </div>
      </div>

      {isAdmin && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Self-evals"
            value={`${cycle.selfSubmittedCount} / ${cycle.selfCount}`}
            hint="Submitted / total"
          />
          <StatCard
            label="Manager-evals"
            value={`${cycle.managerSubmittedCount} / ${cycle.managerCount}`}
            hint="Submitted / total"
          />
          <StatCard
            label="Cadence"
            value={cycle.cadence === 'monthly' ? 'Monthly' : 'Quarterly'}
            hint="Set at creation"
          />
          <StatCard
            label="Status"
            value={cycle.status[0].toUpperCase() + cycle.status.slice(1)}
            hint={
              cycle.status === 'draft'
                ? 'Click "Open cycle" to assign forms.'
                : cycle.status === 'open'
                ? 'Forms are being filled.'
                : 'Closed.'
            }
          />
        </div>
      )}

      {/* 1. Your own self-evaluation */}
      {mySelfEval && <YourSelfEvalCard submission={mySelfEval} />}

      {/* 2. Your team — per-direct-report cards */}
      {teamPairs.length > 0 && (
        <section className="space-y-3">
          <div>
            <h2 className="text-base font-semibold">Your team</h2>
            <p className="mt-1 text-sm text-muted">
              You evaluate {teamPairs.length}{' '}
              {teamPairs.length === 1 ? 'person' : 'people'} this cycle. You can read each
              person&apos;s self-evaluation once they submit it.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {teamPairs.map((pair) => (
              <TeamMemberCard key={pair.managerEval.submissionId} pair={pair} />
            ))}
          </div>
        </section>
      )}

      {/* Empty state for non-admins with nothing assigned */}
      {!isAdmin && !mySelfEval && teamPairs.length === 0 && (
        <Card>
          <CardBody className="text-sm text-muted">
            No forms are assigned to you in this cycle. If you think this is a mistake, ask HR to
            check that your email in the directory matches the one you sign in with, then click
            &quot;Sync new employees&quot; on the cycle.
          </CardBody>
        </Card>
      )}

      {/* 3. Admin / dept-lead: read-only browse of self-evals by department */}
      {showDeptBrowse && (
        <section className="space-y-3">
          <h2 className="text-base font-semibold">All self-evaluations by department</h2>
          {deptScopedSelfEvals.length === 0 ? (
            <Card>
              <CardBody className="text-sm text-muted">
                No self-evaluations have been generated yet.
              </CardBody>
            </Card>
          ) : (
            <SelfSubsByDepartment subs={deptScopedSelfEvals} myEmail={myEmail} />
          )}
        </section>
      )}

      {/* 4. Admin / dept-lead: aggregate manager rating table */}
      {showManagerTable && (
        <section className="space-y-3">
          <h2 className="text-base font-semibold">Manager evaluation table</h2>
          <p className="text-sm text-muted">
            Aggregate of every manager evaluation. <span className="font-medium">Overall</span> is
            the average of the five ratings (1 best · 5 worst).
          </p>
          <ManagerRatingTable submissions={tableScopedManagerEvals} cycleStatus={cycle.status} />
        </section>
      )}
    </div>
  );
}

function StatCard({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <Card>
      <CardBody>
        <p className="text-xs uppercase tracking-wide text-muted">{label}</p>
        <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
        <p className="mt-1 text-xs text-muted">{hint}</p>
      </CardBody>
    </Card>
  );
}

function CycleStatusText({
  cycle,
}: {
  cycle: { status: 'draft' | 'open' | 'closed'; openedAt: Date | null; closedAt: Date | null };
}) {
  if (cycle.status === 'open') return <>Open since {formatDate(cycle.openedAt)}</>;
  if (cycle.status === 'closed') return <>Closed on {formatDate(cycle.closedAt)}</>;
  return <>Draft</>;
}

function SelfSubsByDepartment({
  subs,
  myEmail,
}: {
  subs: ReviewSubmission[];
  myEmail: string;
}) {
  const grouped = new Map<string, ReviewSubmission[]>();
  for (const s of subs) {
    if (s.reviewerEmail.toLowerCase() === myEmail) continue; // own self-eval is shown above
    const k = s.subjectDepartment || '— Unassigned —';
    if (!grouped.has(k)) grouped.set(k, []);
    grouped.get(k)!.push(s);
  }
  if (grouped.size === 0) {
    return (
      <Card>
        <CardBody className="text-sm text-muted">Nothing else to view here.</CardBody>
      </Card>
    );
  }
  const ordered: { dept: string; rows: ReviewSubmission[] }[] = [];
  for (const d of DEPARTMENTS) {
    if (grouped.has(d)) ordered.push({ dept: d, rows: grouped.get(d)! });
    grouped.delete(d);
  }
  for (const [d, rows] of grouped) ordered.push({ dept: d, rows });

  return (
    <div className="space-y-4">
      {ordered.map(({ dept, rows }) => {
        const submitted = rows.filter(
          (r) => r.status === 'submitted' || r.status === 'locked'
        ).length;
        return (
          <Card key={dept}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{dept}</CardTitle>
                <span className="text-xs text-muted tabular-nums">
                  {submitted} / {rows.length} submitted
                </span>
              </div>
            </CardHeader>
            <ul className="divide-y divide-[rgb(var(--border))]">
              {rows.map((s) => (
                <li key={s.submissionId}>
                  <Link
                    href={`/performance/submissions/${s.submissionId}`}
                    className="flex items-center justify-between gap-4 px-5 py-3 hover:bg-white/[0.03]"
                  >
                    <div>
                      <div className="text-sm font-medium">{s.subjectName}</div>
                      <div className="text-xs text-muted">{s.subjectEmail}</div>
                    </div>
                    <FormStatusBadge status={s.status} />
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        );
      })}
    </div>
  );
}

function FormStatusBadge({ status }: { status: SubmissionStatus }) {
  if (status === 'submitted') return <Badge variant="success">Submitted</Badge>;
  if (status === 'in-progress') return <Badge variant="warning">In progress</Badge>;
  if (status === 'locked') return <Badge variant="muted">Locked</Badge>;
  return <Badge variant="default">Not started</Badge>;
}
