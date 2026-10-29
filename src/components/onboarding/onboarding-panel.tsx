'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Check, ClipboardList, Copy, Mail, RotateCcw, Send } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDate } from '@/lib/format';
import {
  requestOnboardingChangesAction,
  sendOnboardingAction,
  verifyOnboardingAction,
} from '@/app/(app)/onboarding/actions';
import { ONBOARDING_STATUS_LABELS, type OnboardingStatus, type OnboardingSummary } from '@/types/onboarding';

export const STATUS_STYLE: Record<OnboardingStatus, string> = {
  sent: 'bg-slate-100 text-slate-800',
  in_progress: 'bg-[#E6F1FB] text-[#0C447C]',
  submitted: 'bg-amber-50 text-amber-700',
  changes_requested: 'bg-[#FAEEDA] text-[#854F0B]',
  verified: 'bg-[#E1F5EE] text-[#0F6E56]',
};

export function OnboardingStatusBadge({ status }: { status: OnboardingStatus }) {
  return (
    <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium', STATUS_STYLE[status])}>
      {ONBOARDING_STATUS_LABELS[status]}
    </span>
  );
}

export async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success('Link copied — paste it into WhatsApp or email');
  } catch {
    window.prompt('Copy this link:', text);
  }
}

/** Profile-page card: send the onboarding link, follow its progress, verify. */
export function OnboardingPanel({
  employeeId,
  employeeName,
  defaultEmail,
  record,
  canReview,
}: {
  employeeId: string;
  employeeName: string;
  /** Personal email if known, else work email. */
  defaultEmail: string;
  record: OnboardingSummary | null;
  /** Can see the encrypted details (needed to verify / send back). */
  canReview: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [mode, setMode] = useState<'idle' | 'send' | 'changes'>('idle');
  const [to, setTo] = useState(record?.sentTo ?? defaultEmail);
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const first = employeeName.split(' ')[0] || employeeName;

  function send(email: boolean) {
    setError(null);
    start(async () => {
      const res = await sendOnboardingAction(employeeId, { to, email });
      if (!res.ok) { setError(res.error); return; }
      if (email && !res.emailed) toast.error(`Link created, but the email failed: ${res.emailError ?? 'unknown error'}. Copy the link instead.`);
      else if (email) toast.success(`Onboarding form emailed to ${to}`);
      if (!email) await copyText(res.link);
      setMode('idle');
      router.refresh();
    });
  }

  function verify() {
    start(async () => {
      const res = await verifyOnboardingAction(employeeId);
      if (!res.ok) { setError(res.error); return; }
      toast.success(`${first}'s onboarding is verified`);
      router.refresh();
    });
  }

  function sendBack() {
    setError(null);
    start(async () => {
      const res = await requestOnboardingChangesAction(employeeId, note);
      if (!res.ok) { setError(res.error); return; }
      toast.success(res.emailed ? `Sent back to ${first} by email` : 'Sent back — but the email failed. Share the link with them.');
      setMode('idle');
      setNote('');
      router.refresh();
    });
  }

  const status = record?.status ?? null;
  const expired = !!record?.expiresAt && Date.parse(record.expiresAt) < Date.now() && (status === 'sent' || status === 'in_progress' || status === 'changes_requested');

  return (
    <div className="bg-white border border-slate-200/70 rounded-xl p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-[13px] font-medium text-slate-950">
          <ClipboardList size={14} className="text-slate-700" /> Onboarding form
        </p>
        {status && <OnboardingStatusBadge status={status} />}
      </div>

      {!record ? (
        <p className="text-[12px] leading-relaxed text-slate-800">
          Send {first} a link to fill in their personal details, ID numbers and card photos. No sign-in needed.
        </p>
      ) : (
        <dl className="space-y-1.5 text-[12px]">
          <Row k="Sent to" v={record.sentTo} />
          {record.sentAt && <Row k="Sent" v={formatDate(new Date(record.sentAt))} />}
          {record.lastSavedAt && status !== 'verified' && <Row k="Last saved" v={formatDate(new Date(record.lastSavedAt))} />}
          {record.submittedAt && <Row k="Submitted" v={formatDate(new Date(record.submittedAt))} />}
          {record.verifiedAt && <Row k="Verified" v={formatDate(new Date(record.verifiedAt))} />}
          {expired && <p className="text-[11px] text-red-600">The link has expired — send a new one.</p>}
          {status === 'changes_requested' && record.hrNote && (
            <p className="rounded-md bg-[#FAEEDA] px-2 py-1.5 text-[11px] text-[#854F0B]">Asked: {record.hrNote}</p>
          )}
        </dl>
      )}

      {status === 'submitted' && canReview && mode === 'idle' && (
        <div className="mt-4 space-y-2">
          <p className="text-[11px] text-slate-800">Check the details and ID photos on this page, then:</p>
          <button
            type="button"
            onClick={verify}
            disabled={pending}
            className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-[#0F6E56] py-2 text-[12px] font-medium text-white transition hover:bg-[#0c5c48] disabled:opacity-60"
          >
            <Check size={13} /> Verify
          </button>
          <button
            type="button"
            onClick={() => setMode('changes')}
            disabled={pending}
            className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white py-2 text-[12px] font-medium text-slate-700 transition hover:bg-slate-50"
          >
            <RotateCcw size={13} /> Ask for changes
          </button>
        </div>
      )}

      {mode === 'changes' && (
        <div className="mt-4 space-y-2">
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            autoFocus
            placeholder="e.g. The Aadhaar photo is blurry — please upload a clearer one."
            className="w-full rounded-md border border-slate-200 px-2.5 py-2 text-[12px] focus:border-[#0C447C] focus:outline-none focus:ring-2 focus:ring-[#0C447C]/20"
          />
          <div className="flex gap-2">
            <button type="button" onClick={() => setMode('idle')} className="flex-1 rounded-lg border border-slate-200 py-1.5 text-[12px] text-slate-800 hover:bg-slate-50">
              Cancel
            </button>
            <button
              type="button"
              onClick={sendBack}
              disabled={pending || !note.trim()}
              className="flex-1 rounded-lg bg-[#0C447C] py-1.5 text-[12px] font-medium text-white hover:bg-[#0a3a6a] disabled:opacity-50"
            >
              {pending ? 'Sending…' : 'Send back'}
            </button>
          </div>
        </div>
      )}

      {record?.link && !expired && mode === 'idle' && (
        <button
          type="button"
          onClick={() => copyText(record.link!)}
          className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white py-2 text-[12px] font-medium text-slate-700 transition hover:bg-slate-50"
        >
          <Copy size={13} /> Copy link
        </button>
      )}

      {mode === 'send' ? (
        <div className="mt-4 space-y-2">
          <label className="block text-[11px] font-medium text-slate-800">Email it to</label>
          <input
            type="email"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="h-8 w-full rounded-md border border-slate-200 px-2.5 text-[12px] focus:border-[#0C447C] focus:outline-none focus:ring-2 focus:ring-[#0C447C]/20"
          />
          {record?.link && <p className="text-[11px] text-slate-700">A new link replaces the old one.</p>}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => send(false)}
              disabled={pending}
              className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-slate-200 py-1.5 text-[12px] text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              title="Create the link without emailing — it's copied for you to share"
            >
              <Copy size={12} /> Just copy link
            </button>
            <button
              type="button"
              onClick={() => send(true)}
              disabled={pending}
              className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-[#0C447C] py-1.5 text-[12px] font-medium text-white hover:bg-[#0a3a6a] disabled:opacity-50"
            >
              <Mail size={12} /> {pending ? 'Sending…' : 'Email link'}
            </button>
          </div>
          <button type="button" onClick={() => setMode('idle')} className="w-full text-[11px] text-slate-700 hover:text-slate-600">
            Cancel
          </button>
        </div>
      ) : (
        mode === 'idle' && status !== 'submitted' && (
          <button
            type="button"
            onClick={() => { setTo(record?.sentTo ?? defaultEmail); setError(null); setMode('send'); }}
            className={cn(
              'mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg py-2 text-[12px] font-medium transition',
              record ? 'text-[#0C447C] hover:bg-[#E6F1FB]' : 'bg-[#0C447C] text-white hover:bg-[#0a3a6a]',
            )}
          >
            <Send size={13} /> {!record ? 'Send onboarding form' : status === 'verified' ? 'Re-open & send again' : 'Send a new link'}
          </button>
        )
      )}

      {error && <p className="mt-2 text-[11px] text-red-600">{error}</p>}
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-slate-700">{k}</dt>
      <dd className="truncate text-right text-slate-700">{v}</dd>
    </div>
  );
}
