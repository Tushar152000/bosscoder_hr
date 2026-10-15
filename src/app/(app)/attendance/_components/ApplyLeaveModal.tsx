'use client';

import { useRef, useState, useEffect, useMemo } from 'react';
import { X, Paperclip, FileText, CalendarDays, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { applyLeave, uploadLeaveDocument } from '../actions';
import type { LeaveBalance, LeaveRequest, LeaveType } from '@/types/attendance';
import {
  LEAVE_LABELS,
  ALL_LEAVE_TYPES,
  HALF_DAY_LEAVE_TYPES,
} from '@/types/attendance';
import { cn } from '@/lib/utils';
import { formatLeaveDates, leaveDates } from '@/lib/leave-days';
import { LeaveDatePicker } from './LeaveDatePicker';
import { LeaveBalancePreview } from './LeaveBalancePreview';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employeeId: string;
  employeeName: string;
  balance: LeaveBalance;
  /** Their existing requests — days already pending/approved can't be picked again. */
  existingRequests?: LeaveRequest[];
  onApplied?: (req: LeaveRequest) => void;
}

/** Today in the user's own calendar (not UTC, which is still "yesterday" before 5:30 IST). */
function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}


export function ApplyLeaveModal({
  open,
  onOpenChange,
  employeeId,
  employeeName,
  balance,
  existingRequests = [],
  onApplied,
}: Props) {
  const [leaveType, setLeaveType] = useState<LeaveType>('casual');
  const [dates, setDates] = useState<string[]>([]);
  // First day tapped, waiting for the last one.
  const [pickingEnd, setPickingEnd] = useState(false);
  // Bumped by "Clear" to reset the calendar, including a half-chosen range.
  const [pickerKey, setPickerKey] = useState(0);
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState(false);
  const reasonRef = useRef<HTMLTextAreaElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isHalfDay = HALF_DAY_LEAVE_TYPES.has(leaveType);

  const taken = useMemo(() => {
    const m = new Map<string, 'pending' | 'approved'>();
    for (const r of existingRequests) {
      if (r.status !== 'pending' && r.status !== 'approved') continue;
      for (const d of leaveDates(r)) if (!m.has(d) || r.status === 'approved') m.set(d, r.status);
    }
    return m;
  }, [existingRequests]);

  // Only the dates gate the button; a missing reason is pointed out on submit.
  const canSubmit = dates.length > 0;

  useEffect(() => {
    if (open) {
      setLeaveType('casual');
      setDates([]);
      setPickingEnd(false);
      setReason('');
      setReasonError(false);
      setFile(null);
    }
  }, [open]);

  // Half-day leave is for one day only.
  useEffect(() => {
    setPickingEnd(false);
    if (isHalfDay) setDates((prev) => prev.slice(0, 1));
  }, [isHalfDay]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOpenChange(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onOpenChange]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    if (!f) { setFile(null); return; }
    if (!ALLOWED_TYPES.includes(f.type)) {
      toast.error('Only JPG, PNG, WEBP or PDF files are allowed');
      e.target.value = '';
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      toast.error('File too large — max 10 MB');
      e.target.value = '';
      return;
    }
    setFile(f);
  }

  function removeFile() {
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (dates.length === 0) { toast.error('Pick your leave days on the calendar'); return; }
    if (!reason.trim()) {
      setReasonError(true);
      reasonRef.current?.focus();
      return;
    }

    const fromDate = dates[0]!;
    const toDate = dates[dates.length - 1]!;

    setSaving(true);

    // Upload the supporting document first (if any) so the URL can be stored on the request.
    let attachmentUrl: string | undefined;
    let attachmentName: string | undefined;
    if (file) {
      const fd = new FormData();
      fd.append('file', file);
      const up = await uploadLeaveDocument(fd);
      if (!up.ok) {
        setSaving(false);
        toast.error(up.error);
        return;
      }
      attachmentUrl = up.data.url;
      attachmentName = up.data.name;
    }

    const result = await applyLeave({
      employeeId,
      employeeName,
      dates,
      fromDate,
      toDate,
      leaveType,
      reason: reason.trim(),
      attachmentUrl,
      attachmentName,
    });
    setSaving(false);

    if (result.ok) {
      toast.success('Leave request submitted');
      onApplied?.({
        employeeId,
        employeeName,
        fromDate,
        toDate,
        dates,
        leaveType,
        reason: reason.trim(),
        status: 'pending',
        approvedBy: null,
        approvedAt: null,
        attachmentUrl,
        attachmentName,
        createdAt: new Date().toISOString(),
      });
      onOpenChange(false);
    } else {
      toast.error(result.error);
    }
  }

  const first = dates[0];
  const last = dates[dates.length - 1];
  const dayLabel = isHalfDay ? 'Half day' : `${dates.length} day${dates.length === 1 ? '' : 's'}`;

  return (
    // Bottom sheet on phones, centred dialog from `sm` up. Header and footer stay put; the middle scrolls.
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 backdrop-blur-[2px] sm:items-center sm:px-4">
      <button type="button" onClick={() => onOpenChange(false)} className="absolute inset-0" aria-label="Close" />
      <form
        onSubmit={handleSubmit}
        role="dialog"
        aria-modal="true"
        aria-labelledby="apply-leave-title"
        className="relative flex max-h-[92dvh] w-full max-w-[460px] flex-col overflow-hidden sm:max-w-[760px] rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl"
      >
        {/* Header */}
        <div className="flex items-start gap-3 border-b border-zinc-100 px-5 py-4">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#EBF3FE] text-[#0C447C]">
            <CalendarDays className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id="apply-leave-title" className="text-[17px] font-semibold text-zinc-900">Apply for leave</h2>
            <p className="mt-0.5 text-[12px] text-zinc-500">Pick your days — your manager gets the request.</p>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            aria-label="Close"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        {/* Phones: one column, balance under the calendar. sm+: form left, balance pinned right. */}
        <div className="grid flex-1 grid-cols-1 content-start gap-5 overflow-y-auto overscroll-contain px-5 py-4 sm:grid-cols-[minmax(0,1fr)_230px]">
          <div className="sm:sticky sm:top-0 sm:col-start-2 sm:row-span-4 sm:row-start-1 sm:self-start max-sm:order-3">
            <LeaveBalancePreview balance={balance} leaveType={leaveType} days={dates.length} />
          </div>

          {/* Leave type */}
          <div className="space-y-1.5 sm:col-start-1 max-sm:order-1">
            <label htmlFor="leave-type" className="block text-[12px] font-medium text-zinc-700">Leave type</label>
            <div className="relative">
              <select
                id="leave-type"
                value={leaveType}
                onChange={(e) => setLeaveType(e.target.value as LeaveType)}
                className="h-11 w-full appearance-none rounded-xl border border-zinc-200 bg-white pl-3.5 pr-10 text-base font-medium text-zinc-800 outline-none transition focus:border-[#0C447C] focus:ring-2 focus:ring-[#0C447C]/15 sm:h-10 sm:text-[13px]"
              >
                {ALL_LEAVE_TYPES.map((t) => (
                  <option key={t} value={t}>{LEAVE_LABELS[t]}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            </div>
          </div>

          {/* Dates */}
          <div className="space-y-2 sm:col-start-1 max-sm:order-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[12px] font-medium text-zinc-700">{isHalfDay ? 'Date' : 'Dates'}</span>
              {dates.length > 0 && (
                <button type="button" onClick={() => { setDates([]); setPickingEnd(false); setPickerKey((k) => k + 1); }} className="text-[12px] font-medium text-[#0C447C] hover:underline">
                  Clear
                </button>
              )}
            </div>

            <LeaveDatePicker
              key={`${isHalfDay ? 'single' : 'range'}-${pickerKey}`}
              single={isHalfDay}
              value={dates}
              onChange={setDates}
              onPendingChange={setPickingEnd}
              minDate={todayISO()}
              taken={taken}
            />

            <p className="text-[12px] text-zinc-500">
              {pickingEnd ? (
                <span className="font-medium text-[#0C447C]">Now tap the last day — or the same day again for a single day.</span>
              ) : dates.length > 0 ? (
                <>
                  <span className="font-semibold text-zinc-900">{dayLabel}</span>
                  {' · '}
                  <span className="text-zinc-700">{formatLeaveDates({ fromDate: first!, toDate: last!, dates })}</span>
                </>
              ) : isHalfDay ? (
                'Tap the day.'
              ) : (
                'Tap the first day, then the last day. Sundays don’t count.'
              )}
            </p>
          </div>

          {/* Reason */}
          <div className="space-y-1.5 sm:col-start-1 max-sm:order-4">
            <label htmlFor="leave-reason" className="text-[12px] font-medium text-zinc-700">
              Reason <span className="text-[#C2410C]">*</span>
            </label>
            <textarea
              id="leave-reason"
              ref={reasonRef}
              value={reason}
              onChange={(e) => { setReason(e.target.value); if (e.target.value.trim()) setReasonError(false); }}
              aria-invalid={reasonError}
              aria-describedby={reasonError ? 'leave-reason-error' : undefined}
              rows={3}
              placeholder="Brief reason for the leave…"
              className={cn(
                'w-full resize-none rounded-xl border bg-white px-3.5 py-2.5 text-base text-zinc-800 outline-none transition placeholder:text-zinc-400 focus:ring-2 sm:text-[13px]',
                reasonError
                  ? 'border-[#E9A5A2] focus:border-[#C2410C] focus:ring-[#C2410C]/15'
                  : 'border-zinc-200 focus:border-[#0C447C] focus:ring-[#0C447C]/15',
              )}
            />
            {reasonError && (
              <p id="leave-reason-error" className="text-[12px] text-[#993C1D]">Add a short reason so your manager knows what it’s for.</p>
            )}
          </div>

          {/* Supporting document */}
          <div className="space-y-1.5 sm:col-start-1 max-sm:order-5">
            <label className="text-[12px] font-medium text-zinc-700">
              Supporting document <span className="font-normal text-zinc-400">(optional)</span>
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              onChange={handleFileChange}
              className="hidden"
            />
            {!file ? (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-zinc-300 bg-zinc-50 px-3 py-3 text-[13px] text-zinc-500 transition hover:border-[#0C447C]/40 hover:bg-[#F5F9FF] hover:text-[#0C447C]"
              >
                <Paperclip className="h-3.5 w-3.5" />
                Attach a file <span className="text-zinc-400">· JPG, PNG, WEBP or PDF, max 10 MB</span>
              </button>
            ) : (
              <div className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2.5">
                <FileText className="h-4 w-4 shrink-0 text-[#0C447C]" />
                <span className="min-w-0 flex-1 truncate text-[13px] text-zinc-700">{file.name}</span>
                <span className="shrink-0 text-[11px] text-zinc-400">{(file.size / 1024 / 1024).toFixed(1)} MB</span>
                <button
                  type="button"
                  onClick={removeFile}
                  className="shrink-0 rounded-md p-1 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-600"
                  aria-label="Remove file"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center gap-2 border-t border-zinc-100 bg-white px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:justify-end">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="h-10 flex-1 rounded-xl px-4 text-[13px] font-medium text-zinc-600 transition hover:bg-zinc-100 sm:flex-none"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving || !canSubmit}
            className="h-10 flex-[2] rounded-xl bg-[#0C447C] px-5 text-[13px] font-semibold text-white shadow-sm transition hover:bg-[#0A3A6A] disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none"
          >
            {saving ? 'Submitting…' : dates.length ? `Submit · ${dayLabel}` : 'Submit request'}
          </button>
        </div>
      </form>
    </div>
  );
}

