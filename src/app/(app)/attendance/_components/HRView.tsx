'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { approveLeave, rejectLeave } from '../actions';
import {
  updateEmployeeLeaveBalance,
  bulkUpdateDeptLeaveBalances,
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

  // Balance search/filter
  const [balanceSearch, setBalanceSearch] = useState('');
  const [balanceDept,   setBalanceDept]   = useState('');

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
  const deptMap = new Map<string, { present: number; onLeave: number; absent: number; halfDay: number }>();
  for (const emp of initialAttendanceToday) {
    if (!deptMap.has(emp.department)) deptMap.set(emp.department, { present: 0, onLeave: 0, absent: 0, halfDay: 0 });
    const d = deptMap.get(emp.department)!;
    if      (emp.status === 'present')  d.present++;
    else if (emp.status === 'wfh')      d.present++;
    else if (emp.status === 'half-day') d.halfDay++;
    else if (emp.status === 'leave')    d.onLeave++;
    else if (emp.status === 'absent')   d.absent++;
  }
  const deptStats  = [...deptMap.entries()].sort(([a], [b]) => a.localeCompare(b));
  const awayToday  = initialAttendanceToday.filter((e) => e.status === 'leave' || e.status === 'absent');
  const presentCount = initialAttendanceToday.filter((e) => e.status === 'present' || e.status === 'half-day' || e.status === 'wfh').length;
  const onLeaveCount = initialAttendanceToday.filter((e) => e.status === 'leave').length;
  const absentCount  = initialAttendanceToday.filter((e) => e.status === 'absent').length;

  const allDepts = [...new Set([
    ...initialAttendanceToday.map((e) => e.department),
    ...balances.map((e) => e.department),
  ])].sort();

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

      {/* ── Section 1: Today's snapshot ──────────────────────────────────── */}
      <div>
        <div className="mb-3 flex items-center gap-2">
          <span className="text-[14px] font-semibold uppercase tracking-wide text-brand-blue">Today's overview</span>
          <div className="flex-1 border-t border-zinc-100" />
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Dept snapshot */}
          <div className="rounded-xl border border-zinc-200 bg-white">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-100 px-4 py-3">
              <span className="text-[13px] font-semibold text-zinc-800">Today's snapshot</span>
              <div className="flex gap-2 text-[11px] text-zinc-400">
                <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: '#639922' }} />{presentCount} present</span>
                <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: '#378ADD' }} />{onLeaveCount} on leave</span>
                <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: '#E24B4A' }} />{absentCount} absent</span>
              </div>
            </div>
            <div className="divide-y divide-zinc-50 px-4">
              {deptStats.length === 0 ? (
                <p className="py-4 text-center text-[12px] text-zinc-400">No attendance records for today.</p>
              ) : deptStats.map(([dept, c]) => (
                <div key={dept} className="flex items-center justify-between py-2.5">
                  <span className="text-[12px] font-medium text-zinc-700">{dept}</span>
                  <div className="flex gap-1.5">
                    {(c.present + c.halfDay) > 0 && <span className="rounded-full border border-green-200 bg-green-50 px-2 py-0.5 text-[11px] text-green-700">{c.present + c.halfDay} present</span>}
                    {c.onLeave > 0 && <span className="rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[11px] text-blue-700">{c.onLeave} on leave</span>}
                    {c.absent > 0 && <span className="rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[11px] text-red-700">{c.absent} absent</span>}
                    {(c.present + c.halfDay + c.onLeave + c.absent) === 0 && <span className="text-[11px] text-zinc-400">No records</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
          {/* Away today */}
          <div className="rounded-xl border border-zinc-200 bg-white">
            <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3">
              <span className="text-[13px] font-semibold text-zinc-800">Away today</span>
              <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] text-zinc-500">{awayToday.length}</span>
            </div>
            <div className="max-h-[280px] overflow-y-auto divide-y divide-zinc-50">
              {awayToday.length === 0 ? (
                <p className="px-4 py-4 text-center text-[12px] text-zinc-400">Everyone is in today.</p>
              ) : awayToday.map((emp) => {
                const color = avatarColor(emp.displayName);
                return (
                  <div key={emp.employeeId} className="flex items-center gap-2.5 px-4 py-2.5">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-medium" style={{ backgroundColor: color.bg, color: color.text }}>
                      {getInitials(emp.displayName)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[12px] font-medium text-zinc-800">{emp.displayName}</p>
                      <p className="text-[11px] text-zinc-400">{emp.department}</p>
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
                            <p className="truncate text-[12px] font-medium text-zinc-800">{emp.displayName}</p>
                            <p className="truncate text-[10px] text-zinc-400">{emp.department}</p>
                          </div>
                        </div>
                        {!isEditing ? (
                          <button onClick={() => startEdit(emp)} title="Edit balance"
                            className="ml-1 shrink-0 rounded-md p-1 text-zinc-300 transition hover:bg-zinc-200 hover:text-zinc-600">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                            </svg>
                          </button>
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
