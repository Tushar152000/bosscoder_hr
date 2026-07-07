'use client';

import { useRef, useState, useEffect } from 'react';
import { X, Paperclip, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { applyLeave, uploadLeaveDocument } from '../actions';
import type { LeaveBalance, LeaveRequest, LeaveType } from '@/types/attendance';
import {
  LEAVE_LABELS,
  ALL_LEAVE_TYPES,
  LEAVE_TO_BALANCE,
  HALF_DAY_LEAVE_TYPES,
} from '@/types/attendance';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employeeId: string;
  employeeName: string;
  balance: LeaveBalance;
  onApplied?: (req: LeaveRequest) => void;
}

function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

export function ApplyLeaveModal({
  open,
  onOpenChange,
  employeeId,
  employeeName,
  balance,
  onApplied,
}: Props) {
  const [leaveType, setLeaveType] = useState<LeaveType>('casual');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [reason, setReason] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isHalfDay = HALF_DAY_LEAVE_TYPES.has(leaveType);
  const b = balance[LEAVE_TO_BALANCE[leaveType]];
  const isUnlimited = b.total === 0;
  const remaining = isUnlimited ? null : b.total - b.used;

  const canSubmit =
    !!fromDate &&
    (isHalfDay || (!!toDate && toDate >= fromDate)) &&
    !!reason.trim();

  useEffect(() => {
    if (open) {
      setLeaveType('casual');
      setFromDate('');
      setToDate('');
      setReason('');
      setFile(null);
    }
  }, [open]);

  // For half-day types, lock toDate = fromDate
  useEffect(() => {
    if (isHalfDay) setToDate(fromDate);
  }, [isHalfDay, fromDate]);

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

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!fromDate) { toast.error('Please select a date'); return; }
    if (!isHalfDay && !toDate) { toast.error('Please select an end date'); return; }
    if (!isHalfDay && toDate < fromDate) { toast.error('End date must be on or after the start date'); return; }
    if (!reason.trim()) { toast.error('Please provide a reason'); return; }

    const effectiveToDate = isHalfDay ? fromDate : toDate;

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
      fromDate,
      toDate: effectiveToDate,
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
        toDate: effectiveToDate,
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

  return (
    <div className="fixed inset-0 z-50 flex min-h-[500px] items-center justify-center bg-black/40 px-4">
      <button
        type="button"
        onClick={() => onOpenChange(false)}
        className="absolute inset-0"
        aria-label="Close"
      />
      <div className="relative w-full max-w-md rounded-xl border border-zinc-200 bg-white p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-[14px] md:text-[20px] font-medium text-zinc-900">Apply for leave</h2>
          <button
            onClick={() => onOpenChange(false)}
            className="rounded-lg p-1 text-zinc-400 transition hover:bg-zinc-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Leave type */}
          <div className="space-y-1">
            <label className="text-[12px] font-medium text-zinc-600">Leave type</label>
            <select
              value={leaveType}
              onChange={(e) => setLeaveType(e.target.value as LeaveType)}
              className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-[13px] text-zinc-700 outline-none transition focus:border-zinc-400"
            >
              {ALL_LEAVE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {LEAVE_LABELS[t]}
                </option>
              ))}
            </select>
            <p className="text-[12px] text-zinc-500">
              {leaveType === 'wfh'
                ? `No limit · ${b.used} day${b.used !== 1 ? 's' : ''} taken this year`
                : isUnlimited
                ? 'Unlimited (unpaid)'
                : `${remaining} day${remaining !== 1 ? 's' : ''} remaining`}
            </p>
          </div>

          {/* Dates */}
          <div className={isHalfDay ? '' : 'grid grid-cols-2 gap-3'}>
            <div className="space-y-1">
              <label className="text-[12px] font-medium text-zinc-600">
                {isHalfDay ? 'Date' : 'From date'}
              </label>
              <input
                type="date"
                value={fromDate}
                min={todayISO()}
                onChange={(e) => {
                  setFromDate(e.target.value);
                  if (!isHalfDay && toDate && e.target.value > toDate) setToDate(e.target.value);
                }}
                className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-[13px] text-zinc-700 outline-none transition focus:border-zinc-400"
              />
            </div>
            {!isHalfDay && (
              <div className="space-y-1">
                <label className="text-[12px] font-medium text-zinc-600">To date</label>
                <input
                  type="date"
                  value={toDate}
                  min={fromDate || todayISO()}
                  onChange={(e) => setToDate(e.target.value)}
                  className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-[13px] text-zinc-700 outline-none transition focus:border-zinc-400"
                />
              </div>
            )}
          </div>

          {/* Reason */}
          <div className="space-y-1">
            <label className="text-[12px] font-medium text-zinc-600">Reason</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="Brief reason for the leave…"
              className="w-full resize-none rounded-lg border border-zinc-200 bg-white px-3 py-2 text-[13px] text-zinc-700 outline-none transition focus:border-zinc-400 placeholder:text-zinc-400"
            />
          </div>

          {/* Supporting document */}
          <div className="space-y-1">
            <label className="text-[12px] font-medium text-zinc-600">
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
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-zinc-300 bg-zinc-50 px-3 py-2.5 text-[13px] text-zinc-500 transition hover:border-zinc-400 hover:bg-zinc-100"
              >
                <Paperclip className="h-3.5 w-3.5" />
                Attach a file
              </button>
            ) : (
              <div className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2">
                <FileText className="h-4 w-4 shrink-0 text-zinc-400" />
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
            <p className="text-[11px] text-zinc-400">JPG, PNG, WEBP or PDF · max 10 MB</p>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="text-[13px] text-zinc-500 transition hover:text-zinc-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !canSubmit}
              className="rounded-lg bg-zinc-900 px-4 py-2 text-[13px] font-medium text-white transition hover:bg-zinc-700 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {saving ? 'Submitting…' : 'Submit request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
