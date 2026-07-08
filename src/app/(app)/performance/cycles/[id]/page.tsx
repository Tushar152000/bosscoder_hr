import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ChevronRight,
  ClipboardCheck,
  Clock,
  FileText,
  Home,
  Lock,
  Repeat,
  UserCheck,
} from 'lucide-react';
import { requireUser } from '@/lib/auth/guard';
import { canManageCycles } from '@/lib/auth/review-access';
import { getEmployeeByUserUid } from '@/lib/firestore/employees';
import { getCycle } from '@/lib/firestore/review-cycles';
import { listSubmissionsForCycle } from '@/lib/firestore/review-submissions';
import { TeamMemberCard, type TeamPair } from '@/components/performance/team-member-card';
import { YourSelfEvalCard } from '@/components/performance/your-self-eval-card';
import { SlotTabs } from '@/components/performance/slot-tabs';
import { DeptEvalBrowser } from '@/components/performance/dept-eval-browser';
import {
  CloseCycleButton,
  EditCycleDueDateButton,
  OpenCycleButton,
  ResendCycleEmailsButton,
  SendTestCycleEmailButton,
  SyncEmployeesButton,
} from '@/components/performance/cycle-actions';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { ReviewSubmission } from '@/types/review';

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
  const isFounder = user.roles.includes('founder');
  const me = await getEmployeeByUserUid(user.uid);
  const myEmail = user.email.toLowerCase();
  const isReviewer = (s: ReviewSubmission) =>
    (s.reviewerUid && s.reviewerUid === user.uid) ||
    (!!s.reviewerEmail && s.reviewerEmail.toLowerCase() === myEmail);

  const allSubs = await listSubmissionsForCycle(cycle.cycleId);

  const mySelfEval = allSubs.find((s) => s.kind === 'self' && isReviewer(s)) ?? null;

  const myManagerEvals = allSubs
    .filter((s) => s.kind === 'manager' && isReviewer(s))
    .sort((a, b) => a.subjectName.localeCompare(b.subjectName));

  const allTeamPairs: TeamPair[] = myManagerEvals.map((mEval) => ({
    managerEval: mEval,
    selfEval:
      allSubs.find(
        (s) => s.kind === 'self' && s.subjectEmployeeId === mEval.subjectEmployeeId,
      ) ?? null,
  }));

  // Founders only see cards where the self-eval is submitted or the eval is already done
  const teamPairs = isFounder
    ? allTeamPairs.filter((p) => {
        const evalDone = p.managerEval.status === 'submitted' || p.managerEval.status === 'locked';
        const selfDone = p.selfEval?.status === 'submitted' || p.selfEval?.status === 'locked';
        return evalDone || selfDone;
      })
    : allTeamPairs;

  const myManagedDepts = me?.managedDepartments ?? [];
  const showDeptBrowse = isAdmin || myManagedDepts.length > 0;
  const allSelfEvals = allSubs.filter((s) => s.kind === 'self');
  const deptScopedSelfEvals = isAdmin
    ? allSelfEvals
    : allSelfEvals.filter((s) => myManagedDepts.includes(s.subjectDepartment));

  // Manager-evals keyed by subject, scoped to what this viewer may see (HR/founder:
  // everyone; dept leads: their managed departments). Lets the by-department list
  // surface the rating each person's manager gave — even when that manager does
  // not report to the viewer.
  const scopedManagerEvals = isAdmin
    ? allSubs.filter((s) => s.kind === 'manager')
    : allSubs.filter(
        (s) => s.kind === 'manager' && myManagedDepts.includes(s.subjectDepartment),
      );
  const managerBySubject: Record<string, ReviewSubmission> = {};
  for (const s of scopedManagerEvals) managerBySubject[s.subjectEmployeeId] = s;

  const selfPct =
    cycle.selfCount > 0
      ? Math.round((cycle.selfSubmittedCount / cycle.selfCount) * 100)
      : 0;
  const mgrPct =
    cycle.managerCount > 0
      ? Math.round((cycle.managerSubmittedCount / cycle.managerCount) * 100)
      : 0;

  return (
    <div className="px-6 md:px-10 py-6 space-y-6">

      <nav className="flex items-center gap-1.5 text-[14px] text-slate-400">
        <Link href="/" className="flex items-center gap-1 hover:text-slate-600 transition">
          <Home className="h-3 w-3" />
          Home
        </Link>
        <ChevronRight className="h-2.5 w-2.5" />
        <Link href="/performance" className="hover:text-slate-600 transition">
          Performance
        </Link>
        <ChevronRight className="h-2.5 w-2.5" />
        <span className="text-slate-600">{cycle.name}</span>
      </nav>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[20px] font-medium text-slate-900">{cycle.name}</h1>
          <div className="mt-1 flex items-center gap-2">
            <span className="text-[12px] text-slate-500">
              {cycle.cadence === 'monthly' ? 'Monthly' : 'Quarterly'}
            </span>
            <span className="text-slate-300">·</span>
            <CycleStatusPill status={cycle.status} />
            {cycle.status === 'open' && cycle.openedAt && (
              <>
                <span className="text-slate-300">·</span>
                <span className="text-[12px] text-slate-500">
                  Open since {formatDate(cycle.openedAt)}
                </span>
              </>
            )}
            {cycle.status === 'closed' && cycle.closedAt && (
              <>
                <span className="text-slate-300">·</span>
                <span className="text-[12px] text-slate-500">
                  Closed {formatDate(cycle.closedAt)}
                </span>
              </>
            )}
          </div>
        </div>
        {/* Cycle lifecycle actions are HR / cycle-manager only. Founders are
            observers here (same as the hidden "New cycle" button on /performance). */}
        {isAdmin && !isFounder && (
          <div className="flex items-center gap-2">
            {cycle.status !== 'closed' && (
              <EditCycleDueDateButton
                cycleId={cycle.cycleId}
                currentDueDate={cycle.dueDate}
              />
            )}
            {cycle.status === 'draft' && <OpenCycleButton cycleId={cycle.cycleId} />}
            {cycle.status === 'open' && (
              <>
                <SendTestCycleEmailButton cycleId={cycle.cycleId} />
                <ResendCycleEmailsButton cycleId={cycle.cycleId} cycleName={cycle.name} />
                <SyncEmployeesButton cycleId={cycle.cycleId} />
                <CloseCycleButton cycleId={cycle.cycleId} />
              </>
            )}
          </div>
        )}
      </div>

      {isAdmin && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard
            label="Self-evals"
            value={`${cycle.selfSubmittedCount} / ${cycle.selfCount}`}
            hint="Submitted / total"
            iconBg="bg-[#EBF3FE]"
            iconColor="text-[#0C447C]"
            Icon={ClipboardCheck}
            barPct={selfPct}
            barColor="bg-[#0C447C]"
          />
          <StatCard
            label="Manager-evals"
            value={`${cycle.managerSubmittedCount} / ${cycle.managerCount}`}
            hint="Submitted / total"
            iconBg="bg-[#E1F5EE]"
            iconColor="text-[#0F6E56]"
            Icon={UserCheck}
            barPct={mgrPct}
            barColor="bg-[#0F6E56]"
          />
          <StatCard
            label="Cadence"
            value={cycle.cadence === 'monthly' ? 'Monthly' : 'Quarterly'}
            hint="Set at creation"
            iconBg="bg-[#EEEDFE]"
            iconColor="text-[#534AB7]"
            Icon={Repeat}
          />
          <StatCard
            label="Status"
            value={cycle.status[0].toUpperCase() + cycle.status.slice(1)}
            hint={
              cycle.status === 'draft'
                ? 'Click "Open cycle" to assign forms.'
                : cycle.status === 'open'
                ? 'Forms are being filled.'
                : 'Locked and read-only.'
            }
            iconBg={
              cycle.status === 'open'
                ? 'bg-[#E1F5EE]'
                : cycle.status === 'closed'
                ? 'bg-[#F8FAFC]'
                : 'bg-[#FAEEDA]'
            }
            iconColor={
              cycle.status === 'open'
                ? 'text-[#0F6E56]'
                : cycle.status === 'closed'
                ? 'text-slate-400'
                : 'text-[#854F0B]'
            }
            Icon={cycle.status === 'closed' ? Lock : cycle.status === 'open' ? UserCheck : Clock}
          />
        </div>
      )}

      {/* ── Your own forms: toggle between "My evaluation" and "My team" ── */}
      {(() => {
        const selfContent =
          mySelfEval && !isFounder ? <YourSelfEvalCard submission={mySelfEval} /> : null;
        const teamContent =
          teamPairs.length > 0 ? (
            <section className="space-y-3">
              <p className="text-[13px] text-slate-500">
                You evaluate {teamPairs.length}{' '}
                {teamPairs.length === 1 ? 'person' : 'people'} this cycle.
              </p>
              <div className="grid gap-3 md:grid-cols-2">
                {teamPairs.map((pair) => (
                  <TeamMemberCard key={pair.managerEval.submissionId} pair={pair} />
                ))}
              </div>
            </section>
          ) : null;
        const selfOpen =
          mySelfEval &&
          (mySelfEval.status === 'not-started' || mySelfEval.status === 'in-progress')
            ? 1
            : 0;
        const teamOpen = teamPairs.filter(
          (p) =>
            p.managerEval.status === 'not-started' ||
            p.managerEval.status === 'in-progress',
        ).length;
        return selfContent || teamContent ? (
          <SlotTabs
            defaultKey={selfContent ? 'self' : 'team'}
            tabs={[
              {
                key: 'self',
                label: 'My evaluation',
                icon: 'clipboard',
                count: selfOpen,
                content: selfContent,
              },
              {
                key: 'team',
                label: 'My team',
                icon: 'users',
                accent: 'purple',
                count: teamOpen,
                content: teamContent,
              },
            ]}
          />
        ) : null;
      })()}

      {/* Empty state for non-admins with nothing assigned */}
      {!isAdmin && !mySelfEval && teamPairs.length === 0 && (
        <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-5 text-[13px] text-slate-500">
          No forms are assigned to you in this cycle. If you think this is a mistake, ask HR to
          check that your email in the directory matches the one you sign in with, then click
          &quot;Sync new employees&quot; on the cycle.
        </div>
      )}

      {/* ── Self-evaluations by department, with a department filter ── */}
      {showDeptBrowse && (
        <section className="space-y-3">
          <h2 className="text-[15px] font-medium text-slate-900">
            Evaluations by department
          </h2>
          <p className="-mt-1 text-[12px] text-slate-500">
            Each person&apos;s self-eval status and the rating their manager gave.
          </p>
          {deptScopedSelfEvals.length === 0 ? (
            <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-5 text-[13px] text-slate-500">
              No self-evaluations have been generated yet.
            </div>
          ) : (
            <DeptEvalBrowser
              subs={deptScopedSelfEvals}
              managerBySubject={managerBySubject}
              myEmail={myEmail}
              myUid={user.uid}
              myEmployeeId={me?.employeeId ?? null}
            />
          )}
        </section>
      )}
    </div>
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  hint,
  Icon,
  iconBg,
  iconColor,
  barPct,
  barColor,
}: {
  label: string;
  value: string;
  hint: string;
  Icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  iconColor: string;
  barPct?: number;
  barColor?: string;
}) {
  return (
    <div className="rounded-xl border border-[#E2E8F0] bg-white p-4 shadow-card">
      <div className="mb-3 flex items-center justify-between">
        <div className={cn('grid h-8 w-8 place-items-center rounded-md', iconBg)}>
          <Icon className={cn('h-4 w-4', iconColor)} />
        </div>
      </div>
      <p className="text-[24px] font-medium leading-none text-slate-900 tabular-nums">{value}</p>
      <p className="mt-1 text-[12px] text-slate-500">{label}</p>
      <p className="mt-0.5 text-[11px] text-slate-400">{hint}</p>
      {barPct != null && (
        <div className="mt-3 h-1 overflow-hidden rounded-full bg-[#F8FAFC]">
          <div
            className={cn('h-full rounded-full transition-all', barColor ?? 'bg-[#0C447C]')}
            style={{ width: `${Math.min(barPct, 100)}%` }}
          />
        </div>
      )}
    </div>
  );
}

// ─── Status pill ──────────────────────────────────────────────────────────────

function CycleStatusPill({
  status,
}: {
  status: 'draft' | 'open' | 'closed';
}) {
  if (status === 'open')
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E1F5EE] px-2 py-0.5 text-[11px] font-medium text-[#0F6E56]">
        <span className="h-1.5 w-1.5 rounded-full bg-[#1D9E75]" />
        Open
      </span>
    );
  if (status === 'closed')
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-[#E2E8F0] bg-[#F8FAFC] px-2 py-0.5 text-[11px] font-medium text-slate-500">
        <Lock className="h-2.5 w-2.5" />
        Closed
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-[#E2E8F0] bg-[#F8FAFC] px-2 py-0.5 text-[11px] font-medium text-slate-500">
      <FileText className="h-2.5 w-2.5" />
      Draft
    </span>
  );
}
