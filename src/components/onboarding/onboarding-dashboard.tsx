'use client';

import { useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { AlertCircle, CheckCircle2, ClipboardCheck, Copy, Mail, Search, Send, Users } from 'lucide-react';
import { cn, initials } from '@/lib/utils';
import { colorForName } from '@/lib/directory/colors';
import { formatDate } from '@/lib/format';
import { useDialog } from '@/components/ui/modal';
import { sendOnboardingAction } from '@/app/(app)/onboarding/actions';
import { copyText, OnboardingStatusBadge } from '@/components/onboarding/onboarding-panel';
import type { OnboardingStatus } from '@/types/onboarding';

export interface OnboardingRow {
  employeeId: string;
  name: string;
  designation: string;
  department: string;
  joiningDate: string;
  /** Personal email if known, else work email. */
  sendTo: string;
  status: OnboardingStatus | 'not_sent';
  /** Share of the form's sections filled in, 0–100. Null if you can't see the details. */
  percent: number | null;
  /** Section names still missing. */
  missing: string[];
  link: string | null;
  expired: boolean;
  sentAt: string | null;
  updatedAt: string | null;
}

/** Tile filters — the stages a new joiner's form goes through. */
type Filter = 'all' | 'not_started' | 'filling' | 'review' | 'verified';

const STAGE: Record<OnboardingStatus | 'not_sent', Exclude<Filter, 'all'>> = {
  not_sent: 'not_started',
  sent: 'not_started',
  in_progress: 'filling',
  changes_requested: 'filling',
  submitted: 'review',
  verified: 'verified',
};

/** New joiners who've been sent the onboarding form, and how far each has got. */
export function OnboardingDashboard({ rows }: { rows: OnboardingRow[] }) {
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const [dept, setDept] = useState('');

  const counts = useMemo(() => {
    const c = { all: rows.length, not_started: 0, filling: 0, review: 0, verified: 0 };
    for (const r of rows) c[STAGE[r.status]]++;
    return c;
  }, [rows]);
  const departments = useMemo(() => [...new Set(rows.map((r) => r.department).filter(Boolean))].sort(), [rows]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows
      .filter((r) => {
        if (filter !== 'all' && STAGE[r.status] !== filter) return false;
        if (dept && r.department !== dept) return false;
        if (q && !`${r.name} ${r.designation} ${r.department}`.toLowerCase().includes(q)) return false;
        return true;
      })
      .sort((a, b) => {
        // Needs HR's check first, then the most recently sent.
        const pa = a.status === 'submitted' ? 0 : 1;
        const pb = b.status === 'submitted' ? 0 : 1;
        return pa - pb || (b.sentAt ?? '').localeCompare(a.sentAt ?? '');
      });
  }, [rows, filter, query, dept]);

  const donePct = counts.all ? Math.round((counts.verified / counts.all) * 100) : 0;

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200/70 bg-white p-10 text-center">
        <p className="text-[15px] font-semibold text-slate-950">No onboarding forms sent yet</p>
        <p className="mx-auto mt-1 max-w-md text-[13px] text-slate-800">
          Click <strong>Add new joiner</strong> to create their portal account and email them the onboarding form. They&apos;ll
          show up here so you can follow their progress.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Tiles */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Tile active={filter === 'all'} onClick={() => setFilter('all')} icon={Users} tint="#E6F1FB" color="#0C447C" label="New joiners" value={counts.all} />
        <Tile active={filter === 'not_started'} onClick={() => setFilter('not_started')} icon={Send} tint="#F1F5F9" color="#0F172A" label="Not started" value={counts.not_started} />
        <Tile active={filter === 'filling'} onClick={() => setFilter('filling')} icon={AlertCircle} tint="#E6F1FB" color="#0C447C" label="Filling in" value={counts.filling} />
        <Tile active={filter === 'review'} onClick={() => setFilter('review')} icon={ClipboardCheck} tint="#FEF3C7" color="#92400E" label="Waiting for your check" value={counts.review} />
        <Tile active={filter === 'verified'} onClick={() => setFilter('verified')} icon={CheckCircle2} tint="#E1F5EE" color="#0F6E56" label="Verified" value={counts.verified} />
      </div>

      <div className="rounded-xl border border-slate-200/70 bg-white p-4">
        <div className="flex items-center justify-between text-[13px]">
          <span className="font-semibold text-slate-950">Onboarding complete</span>
          <span className="font-medium text-slate-900">
            {counts.verified} of {counts.all} verified
          </span>
        </div>
        <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-[#0F6E56] transition-[width]" style={{ width: `${donePct}%` }} />
        </div>
      </div>

      {/* Search + department */}
      <div className="flex flex-col gap-2 sm:flex-row">
        <label className="relative flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, role or department"
            className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-8 pr-3 text-[13px] text-slate-950 placeholder:text-slate-500 focus:border-[#0C447C] focus:outline-none focus:ring-2 focus:ring-[#0C447C]/20"
          />
        </label>
        <select
          value={dept}
          onChange={(e) => setDept(e.target.value)}
          className="h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-[13px] text-slate-950 focus:border-[#0C447C] focus:outline-none focus:ring-2 focus:ring-[#0C447C]/20 sm:w-64"
        >
          <option value="">All departments</option>
          {departments.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
      </div>

      {/* Grid */}
      {shown.length === 0 ? (
        <p className="rounded-xl border border-slate-200/70 bg-white p-8 text-center text-[13px] text-slate-800">Nobody matches.</p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {shown.map((r) => <EmployeeCard key={r.employeeId} row={r} />)}
        </div>
      )}
    </div>
  );
}

function Tile({
  active,
  onClick,
  icon: Icon,
  tint,
  color,
  label,
  value,
  sub,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof Users;
  tint: string;
  color: string;
  label: string;
  value: number;
  sub?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'rounded-xl border bg-white p-4 text-left transition hover:shadow-sm',
        active ? 'border-[#0C447C] ring-2 ring-[#0C447C]/15' : 'border-slate-200/70',
      )}
    >
      <div className="flex items-center gap-2">
        <span className="grid h-7 w-7 place-items-center rounded-lg" style={{ backgroundColor: tint }}>
          <Icon className="h-4 w-4" style={{ color }} />
        </span>
        <span className="text-[12px] font-medium text-slate-900">{label}</span>
      </div>
      <p className="mt-2 text-[26px] font-bold leading-none tabular-nums text-slate-950">{value}</p>
      {sub && <p className="mt-1 text-[11px] font-medium text-slate-700">{sub}</p>}
    </button>
  );
}

function EmployeeCard({ row: r }: { row: OnboardingRow }) {
  const router = useRouter();
  const { confirm, dialog } = useDialog();
  const [pending, start] = useTransition();
  const filled = r.status === 'verified' || r.percent === 100;
  const first = r.name.split(' ')[0] || r.name;
  const canCopy = !!r.link && !r.expired && r.status !== 'submitted';

  async function email() {
    const ok = await confirm({
      title: `Email the onboarding form to ${first}?`,
      body: `It goes to ${r.sendTo}.${r.link ? ' Their previous link will stop working.' : ''}`,
      confirmLabel: 'Send email',
    });
    if (!ok) return;
    start(async () => {
      const res = await sendOnboardingAction(r.employeeId, { to: r.sendTo, email: true });
      if (!res.ok) { toast.error(res.error); return; }
      if (res.emailed) toast.success(`Onboarding form emailed to ${r.sendTo}`);
      else toast.error('Link created, but the email failed — use Copy link instead.');
      router.refresh();
    });
  }

  function copyNewLink() {
    start(async () => {
      const res = await sendOnboardingAction(r.employeeId, { to: r.sendTo, email: false });
      if (!res.ok) { toast.error(res.error); return; }
      await copyText(res.link);
      router.refresh();
    });
  }

  return (
    <div className={cn('flex flex-col rounded-xl border bg-white p-4', r.status === 'submitted' ? 'border-amber-300' : 'border-slate-200/70')}>
      {dialog}
      <div className="flex items-start gap-3">
        <div
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-[13px] font-semibold text-white"
          style={{ backgroundColor: colorForName(r.name) }}
        >
          {initials(r.name, '')}
        </div>
        <div className="min-w-0 flex-1">
          <Link href={`/directory/${r.employeeId}`} className="block truncate text-[14px] font-semibold text-slate-950 hover:text-[#0C447C]">
            {r.name}
          </Link>
          <p className="truncate text-[12px] text-slate-800">{[r.designation, r.department].filter(Boolean).join(' · ') || '—'}</p>
          <p className="text-[11px] text-slate-700">Joined {formatDate(new Date(r.joiningDate))}</p>
        </div>
        {r.percent !== null && (
          <span
            className={cn(
              'shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold',
              filled ? 'bg-[#E1F5EE] text-[#0F6E56]' : 'bg-[#FDECEC] text-[#B42318]',
            )}
          >
            {filled ? 'Filled' : 'Not filled'}
          </span>
        )}
      </div>

      {r.percent !== null && (
        <div className="mt-3">
          <div className="flex items-center justify-between text-[12px]">
            <span className="font-medium text-slate-900">Details filled</span>
            <span className="font-semibold tabular-nums text-slate-950">{r.percent}%</span>
          </div>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
            <div className={cn('h-full rounded-full', filled ? 'bg-[#0F6E56]' : 'bg-[#0C447C]')} style={{ width: `${r.percent}%` }} />
          </div>
          {r.missing.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              <span className="text-[11px] font-medium text-slate-800">Missing:</span>
              {r.missing.map((m) => (
                <span key={m} className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-900">{m}</span>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2 text-[12px] text-slate-800">
        <span className="font-medium text-slate-900">Form:</span>
        {r.status === 'not_sent' ? (
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-900">Not sent</span>
        ) : (
          <OnboardingStatusBadge status={r.status} />
        )}
        {r.expired && <span className="text-[11px] font-medium text-[#B42318]">Link expired</span>}
        {r.updatedAt && r.status !== 'not_sent' && <span className="text-[11px] text-slate-700">· {formatDate(new Date(r.updatedAt))}</span>}
      </div>

      {/* Actions */}
      <div className="mt-auto flex flex-wrap gap-2 pt-4">
        {r.status === 'submitted' ? (
          <Link
            href={`/directory/${r.employeeId}`}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#92400E] px-3 py-2 text-[12px] font-semibold text-white hover:bg-[#7c360c]"
          >
            <ClipboardCheck className="h-3.5 w-3.5" /> Review &amp; verify
          </Link>
        ) : r.status === 'verified' ? (
          <Link
            href={`/directory/${r.employeeId}`}
            className="inline-flex flex-1 items-center justify-center rounded-lg border border-slate-200 px-3 py-2 text-[12px] font-medium text-slate-900 hover:bg-slate-50"
          >
            View details
          </Link>
        ) : (
          <>
            <button
              type="button"
              onClick={email}
              disabled={pending}
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#0C447C] px-3 py-2 text-[12px] font-semibold text-white hover:bg-[#0a3a6a] disabled:opacity-60"
            >
              <Mail className="h-3.5 w-3.5" /> {pending ? 'Working…' : r.status === 'not_sent' ? 'Email form' : 'Email again'}
            </button>
            <button
              type="button"
              onClick={() => (canCopy ? copyText(r.link!) : copyNewLink())}
              disabled={pending}
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-[12px] font-medium text-slate-900 hover:bg-slate-50 disabled:opacity-60"
            >
              <Copy className="h-3.5 w-3.5" /> Copy link
            </button>
          </>
        )}
      </div>
    </div>
  );
}
