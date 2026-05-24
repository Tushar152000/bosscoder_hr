'use client';

import { useState, useTransition, useMemo } from 'react';
import { Plus, Pencil, Trash2, Search, ChevronDown } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from 'recharts';
import { formatDateObj, formatINR } from '@/lib/esop/formatters';
import { useDialog } from '@/components/ui/modal';
import { deleteEsopPlanAction, deleteEsopGrantAction } from '@/app/(app)/esop/actions';
import { EsopPlanForm } from '@/components/esop/esop-plan-form';
import { EsopGrantForm } from '@/components/esop/esop-grant-form';
import type { EsopPlan, EsopGrant } from '@/types/esop';
import type { EmployeePublic } from '@/types/employee';

interface Props {
  plans: EsopPlan[];
  employees: EmployeePublic[];
  allGrants: EsopGrant[];
}

const STATUS_STYLE: Record<string, { label: string; cls: string }> = {
  active:    { label: 'Active',    cls: 'bg-[#E1F5EE] text-[#27500A]' },
  exercised: { label: 'Exercised', cls: 'bg-[#EBF3FE] text-[#0C447C]' },
  lapsed:    { label: 'Lapsed',    cls: 'bg-[#FEE2E2] text-[#991B1B]' },
};

export function EsopClientPanel({ plans, employees, allGrants }: Props) {
  const [tab, setTab] = useState<'overview' | 'plans' | 'grants'>('overview');
  const [showPlanForm, setShowPlanForm] = useState(false);
  const [showGrantForm, setShowGrantForm] = useState(false);
  const [editPlan, setEditPlan] = useState<EsopPlan | undefined>();
  const [editGrant, setEditGrant] = useState<EsopGrant | undefined>();
  const [search, setSearch] = useState('');
  const [expandedGrant, setExpandedGrant] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const { confirm, dialog } = useDialog();

  const empById = useMemo(() => new Map(employees.map((e) => [e.employeeId, e])), [employees]);
  const planById = useMemo(() => new Map(plans.map((p) => [p.planId, p])), [plans]);

  const filteredGrants = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return allGrants;
    return allGrants.filter((g) => {
      const emp = empById.get(g.employeeId);
      return emp?.displayName.toLowerCase().includes(q) || emp?.email.toLowerCase().includes(q);
    });
  }, [allGrants, search, empById]);

  // Stats
  const totalVestedValue = allGrants.reduce((s, g) => {
    const plan = planById.get(g.planId);
    return s + g.sharesVested * (plan?.perShareValue ?? 0);
  }, 0);
  const totalSharesGranted = allGrants.reduce((s, g) => s + g.sharesGranted, 0);
  const employeesOnEsop = new Set(allGrants.map((g) => g.employeeId)).size;

  // Chart data: vesting milestones across all grants
  const chartData = useMemo(() => {
    const byYear = new Map<string, { past: number; future: number }>();
    const now = new Date();
    for (const g of allGrants) {
      const plan = planById.get(g.planId);
      if (!plan) continue;
      for (const m of (g as EsopGrant & { vestingSchedule?: { date: Date; shares: number }[] }).vestingSchedule ?? []) {
        const yr = m.date instanceof Date ? m.date.getFullYear().toString() : new String(m.date).toString();
        if (!byYear.has(yr)) byYear.set(yr, { past: 0, future: 0 });
        const entry = byYear.get(yr)!;
        if (m.date <= now) entry.past += m.shares;
        else entry.future += m.shares;
      }
    }
    return [...byYear.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([year, { past, future }]) => ({ year, past, future }));
  }, [allGrants, planById]);

  function handleDeletePlan(plan: EsopPlan) {
    startTransition(async () => {
      const ok = await confirm({ title: 'Delete plan?', body: `"${plan.name}" will be permanently deleted.`, intent: 'danger', confirmLabel: 'Delete' });
      if (ok) await deleteEsopPlanAction(plan.planId);
    });
  }

  function handleDeleteGrant(grant: EsopGrant) {
    const emp = empById.get(grant.employeeId);
    startTransition(async () => {
      const ok = await confirm({ title: 'Remove grant?', body: `Remove grant from ${emp?.displayName ?? 'this employee'}?`, intent: 'danger', confirmLabel: 'Remove' });
      if (ok) await deleteEsopGrantAction(grant.grantId);
    });
  }

  return (
    <section className="space-y-4">
      {dialog}
      {showPlanForm && (
        <EsopPlanForm plan={editPlan} onClose={() => { setShowPlanForm(false); setEditPlan(undefined); }} />
      )}
      {showGrantForm && (
        <EsopGrantForm grant={editGrant} plans={plans} employees={employees} onClose={() => { setShowGrantForm(false); setEditGrant(undefined); }} />
      )}

      {/* Section header */}
      <div className="flex items-center justify-between pt-2 border-t border-[#E2E8F0]">
        <p className="text-[10px] font-semibold tracking-[1.4px] uppercase text-[#64748b]">HR admin panel</p>
        <div className="flex gap-1 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-0.5">
          {(['overview', 'plans', 'grants'] as const).map((t) => (
            <button key={t} type="button" onClick={() => setTab(t)}
              className={`px-3 py-1.5 rounded-md text-[12px] font-medium transition capitalize ${tab === t ? 'bg-white shadow-sm text-[#0f172a]' : 'text-[#64748b] hover:text-[#0f172a]'}`}>
              {t === 'overview' ? 'Overview' : t === 'plans' ? 'Plans' : 'Grants'}
            </button>
          ))}
        </div>
      </div>

      {/* ── OVERVIEW TAB ── */}
      {tab === 'overview' && (
        <div className="space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Total plans', value: plans.length.toString() },
              { label: 'Employees on ESOP', value: employeesOnEsop.toString() },
              { label: 'Total shares granted', value: totalSharesGranted.toString() },
              { label: 'Total vested value', value: formatINR(totalVestedValue) },
            ].map((s) => (
              <div key={s.label} className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4 space-y-1">
                <p className="text-[10px] font-semibold uppercase tracking-[1px] text-[#64748b]">{s.label}</p>
                <p className="text-[20px] font-bold text-[#0f172a] tabular-nums">{s.value}</p>
              </div>
            ))}
          </div>

          {/* Vesting chart */}
          {chartData.length > 0 && (
            <div className="rounded-xl border border-[#E2E8F0] bg-white p-5 space-y-3">
              <p className="text-[13px] font-semibold text-[#0f172a]">Shares vesting by year</p>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={chartData} barSize={28} barGap={4}>
                  <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} width={30} />
                  <Tooltip
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E2E8F0', boxShadow: 'none' }}
                    formatter={(v) => [`${v ?? 0} shares`]}
                  />
                  <Bar dataKey="past" name="past" radius={[4, 4, 0, 0]} fill="#0C447C" />
                  <Bar dataKey="future" name="future" radius={[4, 4, 0, 0]} fill="#EBF3FE" stroke="#bcd2ff" strokeWidth={1} />
                </BarChart>
              </ResponsiveContainer>
              <div className="flex items-center gap-4 text-[11px] text-[#64748b]">
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-[#0C447C] inline-block" /> Vested</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-[#EBF3FE] border border-[#bcd2ff] inline-block" /> Upcoming</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── PLANS TAB ── */}
      {tab === 'plans' && (
        <div className="rounded-xl border border-[#E2E8F0] bg-white overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#E2E8F0] bg-[#F8FAFC]">
            <p className="text-[12px] font-semibold text-[#0f172a]">ESOP Plans ({plans.length})</p>
            <button type="button" onClick={() => { setEditPlan(undefined); setShowPlanForm(true); }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#0C447C] text-white px-3 py-1.5 text-[12px] font-medium hover:bg-[#0a3a6a] transition">
              <Plus size={13} /> New plan
            </button>
          </div>
          {plans.length === 0 ? (
            <div className="p-8 text-center text-[13px] text-[#64748b]">No plans yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[680px]">
                <thead className="border-b border-[#E2E8F0] text-[10px] font-semibold uppercase tracking-[0.5px] text-[#64748b]">
                  <tr>
                    <th className="px-5 py-2.5">Plan name</th>
                    <th className="px-5 py-2.5">AGM date</th>
                    <th className="px-5 py-2.5 text-right">Total shares</th>
                    <th className="px-5 py-2.5 text-right">Face value</th>
                    <th className="px-5 py-2.5 text-right">Valuation total</th>
                    <th className="px-5 py-2.5 text-right">Per share</th>
                    <th className="px-5 py-2.5">Type</th>
                    <th className="px-5 py-2.5" />
                  </tr>
                </thead>
                <tbody>
                  {plans.map((p) => (
                    <tr key={p.planId} className="border-t border-[#E2E8F0] hover:bg-[#F8FAFC] transition">
                      <td className="px-5 py-3 text-[13px] font-medium text-[#0f172a]">{p.name}</td>
                      <td className="px-5 py-3 text-[12px] text-[#64748b]">{formatDateObj(p.agmDate)}</td>
                      <td className="px-5 py-3 text-[13px] text-[#0f172a] text-right tabular-nums">{p.totalShares.toLocaleString('en-IN')}</td>
                      <td className="px-5 py-3 text-[12px] text-[#64748b] text-right tabular-nums">₹{p.faceValue}</td>
                      <td className="px-5 py-3 text-[12px] text-[#64748b] text-right tabular-nums">{formatINR(p.valuationTotal)}</td>
                      <td className="px-5 py-3 text-[13px] font-medium text-[#0f172a] text-right tabular-nums">{formatINR(p.perShareValue)}</td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${p.type === 'PSU' ? 'bg-[#EBF3FE] text-[#0C447C]' : 'bg-[#EEEDFE] text-[#534AB7]'}`}>
                          {p.type}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <button type="button" onClick={() => { setEditPlan(p); setShowPlanForm(true); }} className="text-[#64748b] hover:text-[#0f172a] transition"><Pencil size={14} /></button>
                          <button type="button" onClick={() => handleDeletePlan(p)} className="text-[#64748b] hover:text-red-500 transition"><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── GRANTS TAB ── */}
      {tab === 'grants' && (
        <div className="rounded-xl border border-[#E2E8F0] bg-white overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#E2E8F0] bg-[#F8FAFC] gap-3 flex-wrap">
            <div className="flex items-center gap-2 flex-1 min-w-[160px]">
              <Search size={14} className="text-[#64748b] shrink-0" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by employee name…"
                className="text-[12px] bg-transparent outline-none text-[#0f172a] placeholder:text-[#64748b] w-full"
              />
            </div>
            <button type="button" onClick={() => { setEditGrant(undefined); setShowGrantForm(true); }}
              disabled={plans.length === 0}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#0C447C] text-white px-3 py-1.5 text-[12px] font-medium hover:bg-[#0a3a6a] transition disabled:opacity-40 disabled:cursor-not-allowed shrink-0">
              <Plus size={13} /> Assign grant
            </button>
          </div>

          {filteredGrants.length === 0 ? (
            <div className="p-8 text-center text-[13px] text-[#64748b]">
              {search ? 'No grants match your search.' : 'No grants assigned yet.'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[760px]">
                <thead className="border-b border-[#E2E8F0] text-[10px] font-semibold uppercase tracking-[0.5px] text-[#64748b]">
                  <tr>
                    <th className="px-5 py-2.5">Employee</th>
                    <th className="px-5 py-2.5">Plan</th>
                    <th className="px-5 py-2.5 text-right">Granted</th>
                    <th className="px-5 py-2.5 text-right">Vested</th>
                    <th className="px-5 py-2.5 text-right">Unvested</th>
                    <th className="px-5 py-2.5">Status</th>
                    <th className="px-5 py-2.5 text-right">Vested value</th>
                    <th className="px-5 py-2.5" />
                  </tr>
                </thead>
                <tbody>
                  {filteredGrants.map((g) => {
                    const emp = empById.get(g.employeeId);
                    const plan = planById.get(g.planId);
                    const st = STATUS_STYLE[g.status] ?? STATUS_STYLE.active;
                    const unvested = g.sharesGranted - g.sharesVested;
                    const vestedValue = g.sharesVested * (plan?.perShareValue ?? 0);
                    const isExpanded = expandedGrant === g.grantId;

                    return (
                      <>
                        <tr key={g.grantId}
                          className="border-t border-[#E2E8F0] hover:bg-[#F8FAFC] transition cursor-pointer"
                          onClick={() => setExpandedGrant(isExpanded ? null : g.grantId)}
                        >
                          <td className="px-5 py-3">
                            <p className="text-[13px] font-medium text-[#0f172a]">{emp?.displayName ?? g.employeeId}</p>
                            <p className="text-[11px] text-[#64748b]">{emp?.email}</p>
                          </td>
                          <td className="px-5 py-3 text-[12px] text-[#64748b]">{plan?.name ?? '—'}</td>
                          <td className="px-5 py-3 text-[13px] text-[#0f172a] text-right tabular-nums">{g.sharesGranted}</td>
                          <td className="px-5 py-3 text-[13px] font-medium text-[#27500A] text-right tabular-nums">{g.sharesVested}</td>
                          <td className="px-5 py-3 text-[12px] text-[#854F0B] text-right tabular-nums">{unvested}</td>
                          <td className="px-5 py-3">
                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${st.cls}`}>{st.label}</span>
                          </td>
                          <td className="px-5 py-3 text-[13px] font-semibold text-[#0f172a] text-right tabular-nums">{formatINR(vestedValue)}</td>
                          <td className="px-5 py-3">
                            <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                              <ChevronDown size={14} className={`text-[#64748b] transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                              <button type="button" onClick={() => { setEditGrant(g); setShowGrantForm(true); }} className="text-[#64748b] hover:text-[#0f172a] transition"><Pencil size={14} /></button>
                              <button type="button" onClick={() => handleDeleteGrant(g)} className="text-[#64748b] hover:text-red-500 transition"><Trash2 size={14} /></button>
                            </div>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr key={`${g.grantId}-detail`} className="border-t border-[#E2E8F0] bg-[#F8FAFC]">
                            <td colSpan={8} className="px-5 py-3">
                              <p className="text-[11px] font-semibold text-[#64748b] uppercase tracking-[0.5px] mb-2">Vesting milestones</p>
                              <div className="flex flex-wrap gap-2">
                                {(g as EsopGrant & { vestingSchedule?: { date: Date; shares: number }[] }).vestingSchedule?.map((m, i) => {
                                  const isPast = m.date <= new Date();
                                  return (
                                    <div key={i} className={`rounded-lg border px-3 py-2 text-center min-w-[100px] ${isPast ? 'border-[#A4DFC4] bg-[#E1F5EE]' : 'border-[#E2E8F0] bg-white'}`}>
                                      <p className="text-[10px] text-[#64748b]">{formatDateObj(m.date)}</p>
                                      <p className={`text-[14px] font-bold tabular-nums ${isPast ? 'text-[#27500A]' : 'text-[#0f172a]'}`}>{m.shares}</p>
                                      <p className="text-[9px] text-[#64748b]">shares</p>
                                    </div>
                                  );
                                })}
                              </div>
                              {g.notes && <p className="text-[11px] text-[#64748b] mt-2">{g.notes}</p>}
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
      )}
    </section>
  );
}
