'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { approveLeave, rejectLeave } from '../actions';
import {
  updateEmployeeLeaveBalance,
  bulkUpdateDeptLeaveBalances,
  getEmployeeLeaveHistory,
} from '@/lib/actions/hr';
import type { LeaveRequest } from '@/types/attendance';
import { LEAVE_LABELS, ALL_LEAVE_TYPES } from '@/types/attendance';
import type { EmployeeAttendanceToday, EmployeeLeaveBalance } from '@/lib/actions/hr';

const AVATAR_COLORS = [
  { bg: '#E6F1FB', text: '#0C447C' },
  { bg: '#FBEAF0', text: '#72243E' },
  { bg: '#E1F5EE', text: '#085041' },
  { bg: '#EEEDFE', text: '#3C3489' },
];

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const POOLS = [
  { key: 'casual'    as const, label: 'Casual',    short: 'C'  },
  { key: 'privilege' as const, label: 'Privilege', short: 'P'  },
  { key: 'medical'   as const, label: 'Medical',   short: 'Me' },
  { key: 'marriage'  as const, label: 'Marriage',  short: 'Ma' },
  { key: 'unpaid'    as const, label: 'Unpaid',    short: 'U'  },
  { key: 'wfh'       as const, label: 'WFH',       short: 'W'  },
];

/** Uncapped pools — `total` 0 means no limit; the card shows days taken, not "remaining". */
const UNLIMITED_POOLS = new Set<string>(['unpaid', 'wfh']);

type DraftEntry = { total: string; used: string };
type Draft = Record<string, DraftEntry>;

function getInitials(name: string) {
  const p = name.trim().split(/\s+/);
  return ((p[0]?.[0] ?? '') + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase();
}

function avatarColor(str: string) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

function formatDate(dateStr: string) {
  const [, m, d] = dateStr.split('-');
  return `${parseInt(d)} ${MONTHS[parseInt(m) - 1]}`;
}

function dayCount(from: string, to: string) {
  return Math.round(
    (new Date(to + 'T00:00:00').getTime() - new Date(from + 'T00:00:00').getTime()) / 86_400_000,
  ) + 1;
}

function intVal(s: string) { return Math.max(0, parseInt(s) || 0); }

/** "12 Jun, 3:40 PM" from an ISO string. */
function formatEditedAt(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) +
    ', ' + d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true });
}

interface Props {
  currentUserEmail: string;
  initialAttendanceToday: EmployeeAttendanceToday[];
  initialLeaveBalances: EmployeeLeaveBalance[];
  initialPendingLeaves: LeaveRequest[];
}

export function HRView({ currentUserEmail, initialAttendanceToday, initialLeaveBalances, initialPendingLeaves }: Props) {
  // ── Leave balances local state (mutable after edits) ───────────────────────
  const [balances,    setBalances]    = useState(initialLeaveBalances);

  // Individual edit
  const [editingId,   setEditingId]   = useState<string | null>(null);
  const [editDraft,   setEditDraft]   = useState<Draft>({});
  const [savingId,    setSavingId]    = useState<string | null>(null);

  // Dept bulk update
  const [bulkOpen,    setBulkOpen]    = useState(false);
  const [bulkDept,    setBulkDept]    = useState('');
  const [bulkTotals,  setBulkTotals]  = useState<Record<string, string>>(
    Object.fromEntries(POOLS.map(({ key }) => [key, key === 'medical' ? '10' : key === 'marriage' ? '5' : key === 'unpaid' || key === 'wfh' ? '0' : '9'])),
  );
  const [savingBulk,  setSavingBulk]  = useState(false);

  // Away-today filter
  const [awayDept, setAwayDept] = useState('');

  // Balance search/filter
  const [balanceSearch, setBalanceSearch] = useState('');
  const [balanceDept,   setBalanceDept]   = useState('');

  // Leave-history popup (lazy-loaded per employee)
  const [historyEmp,     setHistoryEmp]     = useState<EmployeeLeaveBalance | null>(null);
  const [historyItems,   setHistoryItems]   = useState<LeaveRequest[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  async function openHistory(emp: EmployeeLeaveBalance) {
    setHistoryEmp(emp);
    setHistoryItems([]);
    setHistoryLoading(true);
    try {
      setHistoryItems(await getEmployeeLeaveHistory(emp.employeeId));
    } catch {
      toast.error('Failed to load leave history');
    } finally {
      setHistoryLoading(false);
    }
  }

  // Pending leaves
  const [pendingLeaves, setPendingLeaves] = useState(initialPendingLeaves);
  const [processing,    setProcessing]    = useState<string | null>(null);
  const [rejectingId,   setRejectingId]   = useState<string | null>(null);
  const [rejectReason,  setRejectReason]  = useState('');
  const [pendingSearch, setPendingSearch] = useState('');
  const [pendingDept,   setPendingDept]   = useState('');
  const [pendingType,   setPendingType]   = useState('');

  // ── Handlers ───────────────────────────────────────────────────────────────
  function startEdit(emp: EmployeeLeaveBalance) {
    setEditingId(emp.employeeId);
    setEditDraft(
      Object.fromEntries(
        POOLS.map(({ key }) => [key, {
          total: String(emp[key].total),
          used:  String(emp[key].used),
        }]),
      ),
    );
  }

  async function handleSaveIndividual(empId: string) {
    setSavingId(empId);
    try {
      const updates = Object.fromEntries(
        POOLS.map(({ key }) => [key, { total: intVal(editDraft[key].total), used: intVal(editDraft[key].used) }]),
      ) as Record<typeof POOLS[number]['key'], { total: number; used: number }>;

      await updateEmployeeLeaveBalance(empId, updates);
      const stamp = { updatedByEmail: currentUserEmail, updatedAt: new Date().toISOString() };
      setBalances((prev) =>
        prev.map((e) => e.employeeId === empId ? { ...e, ...updates, ...stamp } : e),
      );
      setEditingId(null);
      toast.success('Balance updated');
    } catch {
      toast.error('Failed to update balance');
    } finally {
      setSavingId(null);
    }
  }

  async function handleBulkSave() {
    if (!bulkDept) { toast.error('Select a department first'); return; }
    setSavingBulk(true);
    try {
      const totals = Object.fromEntries(
        POOLS.map(({ key }) => [key, intVal(bulkTotals[key])]),
      ) as Record<typeof POOLS[number]['key'], number>;

      await bulkUpdateDeptLeaveBalances(bulkDept, totals);
      const stamp = { updatedByEmail: currentUserEmail, updatedAt: new Date().toISOString() };
      setBalances((prev) =>
        prev.map((e) =>
          e.department !== bulkDept ? e : {
            ...e,
            ...Object.fromEntries(
              POOLS.map(({ key }) => [key, { total: totals[key], used: e[key].used }]),
            ),
            ...stamp,
          },
        ),
      );
      setBulkOpen(false);
      const count = balances.filter((e) => e.department === bulkDept).length;
      toast.success(`Updated ${count} employees in ${bulkDept}`);
    } catch {
      toast.error('Failed to update balances');
    } finally {
      setSavingBulk(false);
    }
  }

  async function handleApprove(leaveId: string) {
    setProcessing(leaveId);
    try {
      await approveLeave(leaveId);
      setPendingLeaves((prev) => prev.filter((l) => l.id !== leaveId));
      toast.success('Leave approved');
    } catch {
      toast.error('Failed to approve leave');
    } finally {
      setProcessing(null);
    }
  }

  async function handleReject(leaveId: string) {
    setProcessing(leaveId);
    try {
      await rejectLeave(leaveId, rejectReason.trim() || undefined);
      setPendingLeaves((prev) => prev.filter((l) => l.id !== leaveId));
      setRejectingId(null);
      setRejectReason('');
      toast.success('Leave rejected');
    } catch {
      toast.error('Failed to reject leave');
    } finally {
      setProcessing(null);
    }
  }

  // ── Derived ────────────────────────────────────────────────────────────────
  const awayToday  = initialAttendanceToday.filter((e) => e.status === 'leave' || e.status === 'absent');
  const filteredAway = awayToday.filter((e) => !awayDept || e.department === awayDept);
  const onLeaveCount = initialAttendanceToday.filter((e) => e.status === 'leave').length;

  const allDepts = [...new Set([
    ...initialAttendanceToday.map((e) => e.department),
    ...balances.map((e) => e.department),
  ])]
    .filter((d) => d && d.trim())
    .sort();

  const empDeptMap = new Map(balances.map((e) => [e.employeeId, e.department]));

  const filteredBalances = balances.filter((emp) =>
    (!balanceSearch || emp.displayName.toLowerCase().includes(balanceSearch.toLowerCase())) &&
    (!balanceDept   || emp.department === balanceDept),
  );

  const filteredPending = pendingLeaves.filter((req) =>
    (!pendingSearch || req.employeeName.toLowerCase().includes(pendingSearch.toLowerCase())) &&
    (!pendingDept   || empDeptMap.get(req.employeeId) === pendingDept) &&
    (!pendingType   || req.leaveType === pendingType),
  );

  const totalEmployees = balances.length;
  const pendingCount   = pendingLeaves.length;
  const avgBalance = totalEmployees === 0 ? 0 : (() => {
    const cappedPools = POOLS.filter((p) => !UNLIMITED_POOLS.has(p.key));
    const totalRemaining = balances.reduce((sum, e) =>
      sum + cappedPools.reduce((s, { key }) => s + Math.max(0, e[key].total - e[key].used), 0), 0);
    return totalRemaining / totalEmployees / cappedPools.length;
  })();

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="pb-8 space-y-6">

      {/* ── Dept defaults modal ──────────────────────────────────────────── */}
      {bulkOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setBulkOpen(false); }}
        >
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />

          <div className="relative w-full max-w-md rounded-2xl border border-zinc-200 bg-white shadow-xl">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-zinc-100 px-5 py-4">
              <div>
                <h2 className="text-[14px] font-semibold text-zinc-900">Set department defaults</h2>
                <p className="mt-0.5 text-[12px] text-zinc-400">Updates leave totals for all employees in the chosen department. Used days are preserved.</p>
              </div>
              <button
                onClick={() => setBulkOpen(false)}
                className="ml-3 shrink-0 rounded-lg p-1.5 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-600"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Body */}
            <div className="px-5 py-4 space-y-4">
              <div>
                <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-zinc-400">Department</label>
                <select
                  value={bulkDept}
                  onChange={(e) => setBulkDept(e.target.value)}
                  className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-[13px] text-zinc-700 outline-none focus:border-brand-blue focus:ring-1 focus:ring-blue-200"
                >
                  <option value="">— select a department —</option>
                  {allDepts.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
                {bulkDept && (
                  <p className="mt-1 text-[11px] text-zinc-400">
                    {balances.filter((e) => e.department === bulkDept).length} employees will be updated
                  </p>
                )}
              </div>

              <div>
                <label className="mb-2 block text-[11px] font-semibold uppercase tracking-wide text-zinc-400">Leave totals (days)</label>
                <div className="grid grid-cols-1 gap-2">
                  {POOLS.map(({ key, label }) => (
                    <div key={key} className="flex items-center justify-between rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-2">
                      <span className="text-[13px] text-zinc-700">{label}</span>
                      <input
                        type="number" min="0" max="365"
                        value={bulkTotals[key]}
                        onChange={(e) => setBulkTotals((p) => ({ ...p, [key]: e.target.value }))}
                        className="w-16 rounded-lg border border-zinc-200 bg-white px-2 py-1 text-center text-[13px] font-medium text-zinc-800 outline-none focus:border-brand-blue focus:ring-1 focus:ring-blue-200"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 border-t border-zinc-100 px-5 py-3">
              <button
                onClick={() => setBulkOpen(false)}
                className="rounded-lg border border-zinc-200 px-4 py-2 text-[13px] text-zinc-500 transition hover:bg-zinc-50"
              >
                Cancel
              </button>
              <button
                disabled={savingBulk || !bulkDept}
                onClick={handleBulkSave}
                className="rounded-lg bg-brand-blue px-4 py-2 text-[13px] font-medium text-white transition hover:opacity-90 disabled:opacity-50"
              >
                {savingBulk ? 'Saving…' : `Apply to ${balances.filter((e) => e.department === bulkDept).length} employees`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Leave-history popup ──────────────────────────────────────────── */}
      {historyEmp && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setHistoryEmp(null); }}
        >
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />

          <div className="relative flex max-h-[82vh] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/5">
            {/* Header */}
            <div className="relative shrink-0 bg-gradient-to-br from-zinc-50 to-white px-5 pb-4 pt-5">
              <button
                onClick={() => setHistoryEmp(null)}
                className="absolute right-3 top-3 rounded-lg p-1.5 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-600"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
              <div className="flex items-center gap-3 pr-8 min-w-0">
                <div
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[14px] font-semibold ring-2 ring-white shadow-sm"
                  style={{ backgroundColor: avatarColor(historyEmp.displayName).bg, color: avatarColor(historyEmp.displayName).text }}
                >
                  {getInitials(historyEmp.displayName)}
                </div>
                <div className="min-w-0">
                  <h2 className="truncate text-[15px] font-semibold text-zinc-900">{historyEmp.displayName}</h2>
                  <p className="truncate text-[12px] text-zinc-400">{historyEmp.department}</p>
                </div>
              </div>

              {/* Summary chips */}
              {!historyLoading && historyItems.length > 0 && (() => {
                const approvedN = historyItems.filter((r) => r.status === 'approved').length;
                const pendingN  = historyItems.filter((r) => r.status === 'pending').length;
                const rejectedN = historyItems.filter((r) => r.status === 'rejected').length;
                return (
                  <div className="mt-4 flex flex-wrap items-center gap-1.5">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-zinc-600 ring-1 ring-zinc-200">
                      {historyItems.length} total
                    </span>
                    {approvedN > 0 && (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-2.5 py-1 text-[11px] font-medium text-green-700 ring-1 ring-green-200">
                        <span className="h-1.5 w-1.5 rounded-full bg-green-500" />{approvedN} approved
                      </span>
                    )}
                    {pendingN > 0 && (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-amber-700 ring-1 ring-amber-200">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />{pendingN} pending
                      </span>
                    )}
                    {rejectedN > 0 && (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-1 text-[11px] font-medium text-red-700 ring-1 ring-red-200">
                        <span className="h-1.5 w-1.5 rounded-full bg-red-500" />{rejectedN} rejected
                      </span>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* Body */}
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain border-t border-zinc-100 bg-zinc-50/50 px-4 py-4">
              {historyLoading ? (
                <div className="flex flex-col items-center justify-center gap-2 py-12">
                  <svg className="h-5 w-5 animate-spin text-zinc-300" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z" />
                  </svg>
                  <p className="text-[12px] text-zinc-400">Loading history…</p>
                </div>
              ) : historyItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-2 py-12">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-400">
                      <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" />
                    </svg>
                  </div>
                  <p className="text-[12px] text-zinc-400">No leave history yet.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {historyItems.map((req) => {
                    const days     = dayCount(req.fromDate, req.toDate);
                    const approved = req.status === 'approved';
                    const pending  = req.status === 'pending';
                    const dot      = approved ? 'bg-green-500' : pending ? 'bg-amber-500' : 'bg-red-500';
                    const badge    = approved
                      ? 'bg-green-50 text-green-700 ring-green-200'
                      : pending
                      ? 'bg-amber-50 text-amber-700 ring-amber-200'
                      : 'bg-red-50 text-red-700 ring-red-200';
                    return (
                      <div
                        key={req.id ?? req.createdAt}
                        className="rounded-xl border border-zinc-100 bg-white p-3 shadow-sm transition hover:border-zinc-200"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className={['h-2 w-2 shrink-0 rounded-full', dot].join(' ')} />
                            <p className="truncate text-[13px] font-semibold text-zinc-800">{LEAVE_LABELS[req.leaveType]}</p>
                          </div>
                          <span className={['shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ring-1', badge].join(' ')}>
                            {req.status}
                          </span>
                        </div>
                        <div className="mt-1.5 flex items-center gap-1.5 pl-4 text-[11px] text-zinc-500">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-zinc-400">
                            <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" />
                          </svg>
                          <span>
                            {formatDate(req.fromDate)}
                            {req.fromDate !== req.toDate && ` – ${formatDate(req.toDate)}`}
                          </span>
                          <span className="text-zinc-300">·</span>
                          <span className="font-medium text-zinc-600">{days} day{days !== 1 ? 's' : ''}</span>
                        </div>
                        {req.reason && (
                          <p className="mt-1.5 pl-4 text-[11px] italic leading-relaxed text-zinc-500">&ldquo;{req.reason}&rdquo;</p>
                        )}
                        {req.attachmentUrl && (
                          <a
                            href={req.attachmentUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-1.5 ml-4 inline-flex max-w-full items-center gap-1.5 rounded-md border border-zinc-200 bg-zinc-50 px-2 py-1 text-[11px] font-medium text-brand-blue transition hover:bg-zinc-100"
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                              <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                            </svg>
                            <span className="truncate">{req.attachmentName ?? 'View document'}</span>
                          </a>
                        )}
                        {req.status === 'rejected' && req.rejectionReason && (
                          <p className="mt-1.5 ml-4 rounded-md bg-red-50 px-2 py-1 text-[11px] text-red-600">
                            Rejected: {req.rejectionReason}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Dashboard stat cards ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Total employees',        value: totalEmployees,              sub: 'active',         color: '#1371FF' },
          { label: 'Pending approvals',      value: pendingCount,                sub: 'leave requests', color: '#D97706' },
          { label: 'On leave today',         value: onLeaveCount,                sub: 'employees',      color: '#2563EB' },
          { label: 'Avg balance / employee', value: avgBalance.toFixed(1) + ' days', sub: 'across leave pools', color: '#059669' },
        ].map(({ label, value, sub, color }) => (
          <div key={label} className="rounded-xl border border-zinc-200 bg-white px-4 py-3.5">
            <p className="text-[11px] font-medium text-zinc-400">{label}</p>
            <p className="mt-1 text-[22px] font-semibold tabular-nums leading-none" style={{ color }}>{value}</p>
            <p className="mt-1 text-[11px] text-zinc-400">{sub}</p>
          </div>
        ))}
      </div>

      {/* ── Section 1: Away today ────────────────────────────────────────── */}
      <div>
        <div className="mb-3 flex items-center gap-2">
          <span className="text-[14px] font-semibold uppercase tracking-wide text-brand-blue">Away today</span>
          <span className="text-[11px] text-zinc-400">{filteredAway.length} away</span>
          <div className="flex-1 border-t border-zinc-100" />
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white">
          <div className="flex flex-wrap items-center gap-2 border-b border-zinc-100 px-4 py-3">
            <select value={awayDept} onChange={(e) => setAwayDept(e.target.value)}
              className="rounded-lg border border-zinc-200 px-2.5 py-1.5 text-[12px] text-zinc-600 outline-none focus:border-zinc-300">
              <option value="">All departments</option>
              {allDepts.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div className="max-h-[320px] overflow-y-auto divide-y divide-zinc-50">
            {filteredAway.length === 0 ? (
              <p className="px-4 py-6 text-center text-[12px] text-zinc-400">
                {awayToday.length === 0 ? 'Everyone is in today.' : 'No one away in this department.'}
              </p>
            ) : filteredAway.map((emp) => {
              const color = avatarColor(emp.displayName);
              return (
                <div key={emp.employeeId} className="flex items-center gap-2.5 px-4 py-2.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-medium" style={{ backgroundColor: color.bg, color: color.text }}>
                    {getInitials(emp.displayName)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12px] font-medium text-zinc-800">{emp.displayName}</p>
                    <p className="truncate text-[11px] text-zinc-400">{emp.department}</p>
                  </div>
                  <span className={['shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-medium', emp.status === 'leave' ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-red-200 bg-red-50 text-red-700'].join(' ')}>
                    {emp.status === 'leave' ? 'On leave' : 'Absent'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Section 2: Leave balances ─────────────────────────────────────── */}
      <div>
        <div className="mb-3 flex items-center gap-2">
          <span className="text-[14px] font-semibold uppercase tracking-wide text-brand-blue">Leave balances</span>
          <span className="text-[11px] text-zinc-400">{filteredBalances.length} employees</span>
          <div className="flex-1 border-t border-zinc-100" />
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white">
          {/* Filter bar */}
          <div className="flex flex-wrap items-center gap-2 border-b border-zinc-100 px-4 py-3">
            <div className="relative flex-1 min-w-[150px]">
              <svg className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
              </svg>
              <input type="text" placeholder="Search employee…" value={balanceSearch} onChange={(e) => setBalanceSearch(e.target.value)}
                className="w-full rounded-lg border border-zinc-200 py-1.5 pl-7 pr-3 text-[12px] text-zinc-700 outline-none focus:border-zinc-300 focus:ring-1 focus:ring-zinc-200" />
            </div>
            <select value={balanceDept} onChange={(e) => setBalanceDept(e.target.value)}
              className="rounded-lg border border-zinc-200 px-2.5 py-1.5 text-[12px] text-zinc-600 outline-none focus:border-zinc-300">
              <option value="">All departments</option>
              {allDepts.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
            {/* Dept defaults button — opens modal */}
            <button
              onClick={() => { setBulkOpen(true); setBulkDept(''); }}
              className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-[12px] font-medium text-zinc-600 transition hover:bg-zinc-50"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
              </svg>
              Dept defaults
            </button>
          </div>

          {/* Employee grid */}
          <div className="overflow-y-auto p-4" style={{ maxHeight: '480px' }}>
            {filteredBalances.length === 0 ? (
              <p className="py-4 text-center text-[12px] text-zinc-400">No employees found.</p>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filteredBalances.map((emp) => {
                  const color    = avatarColor(emp.displayName);
                  const isEditing = editingId === emp.employeeId;
                  const isSaving  = savingId  === emp.employeeId;

                  return (
                    <div key={emp.employeeId} className={['rounded-lg border bg-zinc-50 p-3 transition', isEditing ? 'border-brand-blue ring-1 ring-brand-blue/20' : 'border-zinc-100'].join(' ')}>
                      {/* Card header */}
                      <div className="flex items-center justify-between mb-2.5">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-medium" style={{ backgroundColor: color.bg, color: color.text }}>
                            {getInitials(emp.displayName)}
                          </div>
                          <div className="min-w-0">
                            <button
                              type="button"
                              onClick={() => openHistory(emp)}
                              title="View leave history"
                              className="block max-w-full truncate text-left text-[12px] font-medium text-zinc-800 transition hover:text-brand-blue hover:underline"
                            >
                              {emp.displayName}
                            </button>
                            <p className="truncate text-[10px] text-zinc-400">{emp.department}</p>
                          </div>
                        </div>
                        {!isEditing ? (
                          <div className="ml-1 flex shrink-0 gap-1">
                            <button onClick={() => openHistory(emp)} title="View leave history"
                              className="rounded-md p-1 text-zinc-300 transition hover:bg-zinc-200 hover:text-zinc-600">
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" />
                              </svg>
                            </button>
                            <button onClick={() => startEdit(emp)} title="Edit balance"
                              className="rounded-md p-1 text-zinc-300 transition hover:bg-zinc-200 hover:text-zinc-600">
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                              </svg>
                            </button>
                          </div>
                        ) : (
                          <div className="ml-1 flex shrink-0 gap-1">
                            <button onClick={() => handleSaveIndividual(emp.employeeId)} disabled={isSaving}
                              className="rounded-md bg-green-600 p-1 text-white transition hover:bg-green-700 disabled:opacity-50" title="Save">
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M20 6L9 17l-5-5" />
                              </svg>
                            </button>
                            <button onClick={() => setEditingId(null)} disabled={isSaving}
                              className="rounded-md border border-zinc-200 bg-white p-1 text-zinc-400 transition hover:bg-zinc-100" title="Cancel">
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M18 6L6 18M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        )}
                      </div>

                      {/* View mode: compact pills */}
                      {!isEditing && (
                        <div className="grid grid-cols-6 gap-1">
                          {POOLS.map(({ key, short }) => {
                            const unlimited = UNLIMITED_POOLS.has(key) && emp[key].total === 0;
                            const remaining = emp[key].total - emp[key].used;
                            const isLow = !unlimited && key !== 'unpaid' && remaining <= 2;
                            const value = unlimited ? emp[key].used : remaining;
                            return (
                              <div key={key} title={unlimited ? `${key}: ${emp[key].used} taken (no limit)` : `${key}: ${remaining} left of ${emp[key].total}`}
                                className={['rounded-md border px-1 py-1 text-center', isLow ? 'border-red-200 bg-red-50' : 'border-zinc-200 bg-white'].join(' ')}>
                                <p className={['text-[9px] font-medium', isLow ? 'text-red-500' : 'text-zinc-400'].join(' ')}>{short}</p>
                                <p className={['text-[11px] font-semibold tabular-nums', isLow ? 'text-red-700' : 'text-zinc-800'].join(' ')}>{value}</p>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Edit mode: full rows */}
                      {isEditing && (
                        <div className="space-y-1.5">
                          <div className="grid grid-cols-3 items-center gap-1 pb-1">
                            <span className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400" />
                            <span className="text-center text-[10px] font-semibold uppercase tracking-wide text-zinc-400">Total</span>
                            <span className="text-center text-[10px] font-semibold uppercase tracking-wide text-zinc-400">Used</span>
                          </div>
                          {POOLS.map(({ key, label }) => (
                            <div key={key} className="grid grid-cols-3 items-center gap-1">
                              <span className="text-[11px] text-zinc-600">{label}</span>
                              <input type="number" min="0" max="365"
                                value={editDraft[key]?.total ?? ''}
                                onChange={(e) => setEditDraft((p) => ({ ...p, [key]: { ...p[key], total: e.target.value } }))}
                                className="rounded-md border border-zinc-200 px-1.5 py-1 text-center text-[12px] text-zinc-800 outline-none focus:border-brand-blue focus:ring-1 focus:ring-blue-200"
                              />
                              <input type="number" min="0" max="365"
                                value={editDraft[key]?.used ?? ''}
                                onChange={(e) => setEditDraft((p) => ({ ...p, [key]: { ...p[key], used: e.target.value } }))}
                                className="rounded-md border border-zinc-200 px-1.5 py-1 text-center text-[12px] text-zinc-800 outline-none focus:border-brand-blue focus:ring-1 focus:ring-blue-200"
                              />
                            </div>
                          ))}
                          {isSaving && <p className="pt-1 text-center text-[11px] text-zinc-400">Saving…</p>}
                        </div>
                      )}

                      {!isEditing && emp.updatedByEmail && (
                        <p
                          className="mt-2 truncate border-t border-zinc-100 pt-1.5 text-[10px] text-zinc-400"
                          title={`Edited by ${emp.updatedByEmail}${emp.updatedAt ? ` · ${formatEditedAt(emp.updatedAt)}` : ''}`}
                        >
                          <span className="text-zinc-300">✎ </span>
                          {emp.updatedByEmail.split('@')[0]}
                          {emp.updatedAt && (
                            <span className="text-zinc-300"> · {formatEditedAt(emp.updatedAt)}</span>
                          )}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Section 3: Pending leaves ─────────────────────────────────────── */}
      <div>
        <div className="mb-3 flex items-center gap-2">
          <span className="text-[14px] font-semibold uppercase tracking-wide text-amber-600">Pending leaves</span>
          {pendingLeaves.length > 0 && (
            <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[11px] font-medium text-amber-700">{pendingLeaves.length}</span>
          )}
          <div className="flex-1 border-t border-zinc-100" />
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white">
          <div className="flex flex-wrap items-center gap-2 border-b border-zinc-100 px-4 py-3">
            <div className="relative flex-1 min-w-[150px]">
              <svg className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
              </svg>
              <input type="text" placeholder="Search employee…" value={pendingSearch} onChange={(e) => setPendingSearch(e.target.value)}
                className="w-full rounded-lg border border-zinc-200 py-1.5 pl-7 pr-3 text-[12px] text-zinc-700 outline-none focus:border-zinc-300 focus:ring-1 focus:ring-zinc-200" />
            </div>
            <select value={pendingDept} onChange={(e) => setPendingDept(e.target.value)}
              className="rounded-lg border border-zinc-200 px-2.5 py-1.5 text-[12px] text-zinc-600 outline-none focus:border-zinc-300">
              <option value="">All departments</option>
              {allDepts.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
            <select value={pendingType} onChange={(e) => setPendingType(e.target.value)}
              className="rounded-lg border border-zinc-200 px-2.5 py-1.5 text-[12px] text-zinc-600 outline-none focus:border-zinc-300">
              <option value="">All types</option>
              {ALL_LEAVE_TYPES.map((t) => <option key={t} value={t}>{LEAVE_LABELS[t]}</option>)}
            </select>
          </div>

          {filteredPending.length === 0 ? (
            <p className="px-4 py-8 text-center text-[12px] text-zinc-400">
              {pendingLeaves.length === 0 ? 'No pending leave requests.' : 'No requests match your filters.'}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px]">
                <thead>
                  <tr className="border-b border-zinc-100">
                    {['Employee', 'Department', 'Type', 'From', 'To', 'Days', 'Actions'].map((h) => (
                      <th key={h} className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-zinc-400">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-50">
                  {filteredPending.map((req) => {
                    const color    = avatarColor(req.employeeName);
                    const days     = dayCount(req.fromDate, req.toDate);
                    const isBusy   = processing === req.id;
                    const isReject = rejectingId === req.id;
                    const dept     = empDeptMap.get(req.employeeId) ?? '—';

                    return (
                      <>
                        <tr key={req.id} className="hover:bg-zinc-50/60">
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-2">
                              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-medium" style={{ backgroundColor: color.bg, color: color.text }}>
                                {getInitials(req.employeeName)}
                              </div>
                              <div>
                                <p className="text-[12px] font-medium text-zinc-800">{req.employeeName}</p>
                                {req.reason && <p className="max-w-[160px] truncate text-[10px] italic text-zinc-400">"{req.reason}"</p>}
                                {req.attachmentUrl && (
                                  <a href={req.attachmentUrl} target="_blank" rel="noopener noreferrer"
                                    className="mt-0.5 inline-flex max-w-[160px] items-center gap-1 text-[10px] font-medium text-brand-blue hover:underline">
                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                                      <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                                    </svg>
                                    <span className="truncate">{req.attachmentName ?? 'Document'}</span>
                                  </a>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-2.5 text-[12px] text-zinc-500">{dept}</td>
                          <td className="px-4 py-2.5">
                            <span className="whitespace-nowrap rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[11px] text-zinc-600">
                              {LEAVE_LABELS[req.leaveType]}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-4 py-2.5 text-[12px] text-zinc-600">{formatDate(req.fromDate)}</td>
                          <td className="whitespace-nowrap px-4 py-2.5 text-[12px] text-zinc-600">{formatDate(req.toDate)}</td>
                          <td className="px-4 py-2.5 text-[12px] font-medium text-zinc-800">{days}d</td>
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-1.5">
                              <button disabled={isBusy} onClick={() => handleApprove(req.id!)}
                                className="rounded-lg border border-green-200 bg-green-50 px-2.5 py-1 text-[11px] font-medium text-green-700 transition hover:bg-green-100 disabled:opacity-50">
                                Approve
                              </button>
                              <button disabled={isBusy} onClick={() => { setRejectingId(isReject ? null : req.id!); setRejectReason(''); }}
                                className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-1 text-[11px] font-medium text-red-600 transition hover:bg-red-100 disabled:opacity-50">
                                Reject
                              </button>
                            </div>
                          </td>
                        </tr>
                        {isReject && (
                          <tr key={`${req.id}-reject`} className="bg-red-50/40">
                            <td colSpan={7} className="px-4 py-2.5">
                              <div className="flex items-center gap-2">
                                <input type="text" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)}
                                  placeholder="Reason for rejection (optional)"
                                  className="flex-1 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-[12px] text-zinc-700 outline-none focus:border-red-300 focus:ring-1 focus:ring-red-200" />
                                <button disabled={isBusy} onClick={() => handleReject(req.id!)}
                                  className="rounded-lg bg-red-600 px-3 py-1.5 text-[12px] font-medium text-white transition hover:bg-red-700 disabled:opacity-50">
                                  {isBusy ? 'Rejecting…' : 'Confirm'}
                                </button>
                                <button onClick={() => { setRejectingId(null); setRejectReason(''); }}
                                  className="rounded-lg border border-zinc-200 px-3 py-1.5 text-[12px] text-zinc-500 transition hover:bg-white">
                                  Cancel
                                </button>
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
