'use client';

import { useState, useEffect } from 'react';
import { Pencil, X } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { editAttendanceRecord } from '../actions';
import type { AttendanceRecord, AttendanceStatus } from '@/types/attendance';
import { STATUS_DISPLAY } from '@/types/attendance';

interface Props {
  employeeId: string;
  records: AttendanceRecord[];
  year: number;
  month: number;
  canEditStatus: boolean;
  onRecordsChange: (records: AttendanceRecord[]) => void;
}

const STATUS_BADGE: Record<AttendanceStatus, string> = {
  present:    'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  absent:     'bg-red-50 text-red-600 ring-1 ring-red-200',
  'half-day': 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  leave:      'bg-blue-50 text-blue-700 ring-1 ring-blue-200',
  wfh:        'bg-violet-50 text-violet-700 ring-1 ring-violet-200',
  holiday:    'bg-slate-100 text-slate-500 ring-1 ring-slate-200',
  weekend:    'bg-slate-100 text-slate-400 ring-1 ring-slate-200',
  pending:    'bg-slate-100 text-slate-500 ring-1 ring-slate-200',
};

const EDITABLE_STATUSES: AttendanceStatus[] = [
  'present', 'absent', 'half-day', 'leave', 'wfh', 'holiday',
];

function formatDateDisplay(dateStr: string): string {
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}

function formatTime(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

function formatDuration(minutes: number): string {
  if (!minutes) return '—';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

function buildDays(year: number, month: number): string[] {
  const count = new Date(year, month, 0).getDate();
  const pad = (n: number) => String(n).padStart(2, '0');
  return Array.from({ length: count }, (_, i) =>
    `${year}-${pad(month)}-${pad(i + 1)}`
  );
}

export function AttendanceTable({
  employeeId,
  records,
  year,
  month,
  canEditStatus,
  onRecordsChange,
}: Props) {
  const [editDate, setEditDate] = useState<string | null>(null);
  const [remarks, setRemarks] = useState('');
  const [status, setStatus] = useState<AttendanceStatus>('absent');
  const [saving, setSaving] = useState(false);

  const days = buildDays(year, month);
  const byDate = new Map(records.map((r) => [r.date, r]));

  function openEdit(date: string) {
    const rec = byDate.get(date);
    setEditDate(date);
    setRemarks(rec?.remarks ?? '');
    setStatus(rec?.status ?? 'absent');
  }

  useEffect(() => {
    if (!editDate) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setEditDate(null); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [editDate]);

  useEffect(() => {
    if (!editDate) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [editDate]);

  async function handleSave() {
    if (!editDate) return;
    setSaving(true);
    const result = await editAttendanceRecord(employeeId, editDate, {
      remarks,
      ...(canEditStatus && { status }),
    });
    setSaving(false);

    if (result.ok) {
      toast.success('Attendance updated');
      const existing = byDate.get(editDate);
      const updated: AttendanceRecord = existing
        ? { ...existing, remarks, ...(canEditStatus && { status }) }
        : {
            employeeId,
            date: editDate,
            checkIn: null,
            checkOut: null,
            status: canEditStatus ? status : 'absent',
            duration: 0,
            remarks,
            editedBy: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
      onRecordsChange(
        existing
          ? records.map((r) => (r.date === editDate ? updated : r))
          : [...records, updated],
      );
      setEditDate(null);
    } else {
      toast.error(result.error);
    }
  }

  return (
    <>
      <div className="space-y-3">
        <div>
          <h2 className="text-[15px] font-semibold text-slate-800">Attendance</h2>
          <p className="mt-0.5 text-[12px] text-slate-500">
            To update your attendance data, please click on the edit button next to each date.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white overflow-hidden shadow-sm">
          {/* Header */}
          <div className="grid grid-cols-[130px_110px_90px_90px_80px_1fr_44px] items-center gap-2 border-b border-slate-100 bg-slate-50/70 px-4 py-2.5">
            {['Date', 'Status', 'Check In', 'Check Out', 'Duration', 'Remarks', 'Edit'].map((h) => (
              <span key={h} className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                {h}
              </span>
            ))}
          </div>

          {/* Rows */}
          {days.map((date) => {
            const rec = byDate.get(date);
            return (
              <div
                key={date}
                className="grid grid-cols-[130px_110px_90px_90px_80px_1fr_44px] items-center gap-2 border-b border-slate-100 px-4 py-3 last:border-0 hover:bg-slate-50/60 transition"
              >
                <span className="text-[12px] text-slate-600">{formatDateDisplay(date)}</span>
                <span>
                  {rec ? (
                    <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium', STATUS_BADGE[rec.status])}>
                      {STATUS_DISPLAY[rec.status]}
                    </span>
                  ) : (
                    <span className="text-[12px] text-slate-400">—</span>
                  )}
                </span>
                <span className="text-[12px] text-slate-600">{formatTime(rec?.checkIn ?? null)}</span>
                <span className="text-[12px] text-slate-600">{formatTime(rec?.checkOut ?? null)}</span>
                <span className="text-[12px] text-slate-600">{rec ? formatDuration(rec.duration) : '—'}</span>
                <span className="truncate text-[12px] text-slate-500">{rec?.remarks || '—'}</span>
                <button
                  onClick={() => openEdit(date)}
                  className="rounded-lg p-1.5 text-[#0C447C] hover:bg-[#EBF3FE] transition"
                  aria-label={`Edit ${date}`}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Edit modal */}
      {editDate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <button
            type="button"
            onClick={() => setEditDate(null)}
            className="absolute inset-0 bg-black/30 backdrop-blur-[2px]"
            aria-label="Close"
          />
          <div className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <h2 className="text-[15px] font-semibold text-slate-800">
                Edit Attendance — {formatDateDisplay(editDate)}
              </h2>
              <button
                onClick={() => setEditDate(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 px-5 py-4">
              {canEditStatus && (
                <div className="space-y-1.5">
                  <label className="text-[12px] font-medium text-slate-500">Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as AttendanceStatus)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] text-slate-700 outline-none focus:border-[#0C447C] focus:ring-2 focus:ring-[#0C447C]/10 transition"
                  >
                    {EDITABLE_STATUSES.map((s) => (
                      <option key={s} value={s}>{STATUS_DISPLAY[s]}</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="space-y-1.5">
                <label className="text-[12px] font-medium text-slate-500">Remarks</label>
                <textarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  rows={3}
                  placeholder="Add a note..."
                  className="w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-[13px] text-slate-700 outline-none focus:border-[#0C447C] focus:ring-2 focus:ring-[#0C447C]/10 transition placeholder:text-slate-400"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-5 py-3">
              <button
                onClick={() => setEditDate(null)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-[13px] font-medium text-slate-600 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="rounded-lg bg-[#0C447C] px-4 py-2 text-[13px] font-medium text-white hover:bg-[#0a3a6a] transition disabled:opacity-60"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
