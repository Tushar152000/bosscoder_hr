'use client';

import { useState, useTransition } from 'react';
import { Rocket, Send, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { sendFeatureLaunchAction, type BroadcastResult } from '@/app/(app)/communications/actions';

interface Recipient { email: string; displayName: string }

interface Props {
  recipients: Recipient[];
  selectedDeptCount: number;
  senderName: string;
  onSent: () => void;
}

export function FeatureLaunchComposer({ recipients, selectedDeptCount, senderName, onSent }: Props) {
  const [featureName, setFeatureName] = useState('');
  const [message, setMessage] = useState('');
  const [ctaLabel, setCtaLabel] = useState('');
  const [ctaUrl, setCtaUrl] = useState('');
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BroadcastResult | null>(null);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);
    startTransition(async () => {
      const res = await sendFeatureLaunchAction({ recipients, featureName, message, ctaLabel, ctaUrl });
      if (!res.ok) { setError(res.error); return; }
      setResult(res.data);
      setFeatureName(''); setMessage(''); setCtaLabel(''); setCtaUrl('');
      onSent();
    });
  }

  const subjectPreview = featureName.trim() ? `🎉 ${featureName.trim()} is now live` : '🎉 [Feature] is now live';

  return (
    <form onSubmit={onSubmit} className="rounded-xl border border-[#E2E8F0] bg-white shadow-sm p-4 sm:p-5 flex flex-col gap-4">
      <div className="flex items-start justify-between gap-2 pb-3 border-b border-[#E2E8F0]">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="grid h-8 w-8 place-items-center rounded-md bg-[#E1F5EE] shrink-0">
            <Rocket className="h-4 w-4 text-[#0F6E56]" />
          </div>
          <div className="min-w-0">
            <p className="text-[14px] font-semibold text-slate-900">Announce a feature launch</p>
            <p className="text-[11px] text-slate-500 mt-0.5 truncate">
              {recipients.length > 0
                ? `${recipients.length} recipient${recipients.length !== 1 ? 's' : ''} · ${selectedDeptCount} dept${selectedDeptCount !== 1 ? 's' : ''}`
                : 'Select departments to add recipients'}
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-[12px] font-medium text-slate-700">From</label>
        <div className="h-11 sm:h-10 flex items-center rounded-md border border-[#E2E8F0] bg-[#F8FAFC] px-3 text-[14px] sm:text-[13px] text-slate-500 truncate">
          {senderName} · Bosscoder HR Team
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-[12px] font-medium text-slate-700">Feature name <span className="text-red-500">*</span></label>
        <input
          type="text" value={featureName} onChange={(e) => setFeatureName(e.target.value)} required
          placeholder="e.g. Attendance & Leave"
          className="h-11 sm:h-10 w-full rounded-md border border-[#E2E8F0] bg-white px-3 text-[16px] sm:text-[13px] text-slate-900 placeholder:text-slate-400 focus:border-[#0F6E56] focus:outline-none focus:ring-2 focus:ring-[#0F6E56]/20"
        />
        <p className="text-[11px] text-slate-400">Email subject will be: <span className="font-medium text-slate-500">{subjectPreview}</span></p>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-[12px] font-medium text-slate-700">What&apos;s new <span className="text-red-500">*</span></label>
        <textarea
          value={message} onChange={(e) => setMessage(e.target.value)} required rows={5}
          placeholder={'Describe the feature and what it lets people do…\n\nUse separate lines for key highlights.'}
          className="w-full rounded-md border border-[#E2E8F0] bg-white px-3 py-2.5 text-[16px] sm:text-[13px] text-slate-900 placeholder:text-slate-400 resize-none focus:border-[#0F6E56] focus:outline-none focus:ring-2 focus:ring-[#0F6E56]/20"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-[12px] font-medium text-slate-700">Button label <span className="text-red-500">*</span></label>
          <input
            type="text" value={ctaLabel} onChange={(e) => setCtaLabel(e.target.value)} required
            placeholder="e.g. Open Attendance"
            className="h-11 sm:h-10 w-full rounded-md border border-[#E2E8F0] bg-white px-3 text-[16px] sm:text-[13px] text-slate-900 placeholder:text-slate-400 focus:border-[#0F6E56] focus:outline-none focus:ring-2 focus:ring-[#0F6E56]/20"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-[12px] font-medium text-slate-700">Button link <span className="text-red-500">*</span></label>
          <input
            type="text" value={ctaUrl} onChange={(e) => setCtaUrl(e.target.value)} required
            placeholder="/attendance  or  https://…"
            className="h-11 sm:h-10 w-full rounded-md border border-[#E2E8F0] bg-white px-3 text-[16px] sm:text-[13px] text-slate-900 placeholder:text-slate-400 focus:border-[#0F6E56] focus:outline-none focus:ring-2 focus:ring-[#0F6E56]/20"
          />
        </div>
      </div>
      <p className="text-[11px] text-slate-400 -mt-2">A relative path like <code>/attendance</code> opens on the HR portal; full URLs are used as-is.</p>

      {error && (
        <div className="flex items-start gap-2 rounded-md border border-[#FAC8C6] bg-[#FAECE7] px-3 py-2.5 text-[13px] text-[#993C1D]">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" /><span>{error}</span>
        </div>
      )}
      {result && (
        <div className="flex items-start gap-2 rounded-md border border-[#B7DDD0] bg-[#E1F5EE] px-3 py-2.5 text-[13px] text-[#0F6E56]">
          <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Announcement sent</p>
            <p className="text-[11px] mt-0.5 text-[#1D9E75]">
              {result.sent} of {result.attempted} delivered{result.failed > 0 && ` · ${result.failed} failed`}
            </p>
            {result.failures.length > 0 && (
              <ul className="mt-1 space-y-0.5">
                {result.failures.map((f, i) => <li key={i} className="text-[10px] text-[#993C1D] break-all">{f}</li>)}
              </ul>
            )}
          </div>
        </div>
      )}

      <Button
        type="submit" variant="primary"
        className="w-full gap-2 h-12 sm:h-10 text-[15px] sm:text-[14px] mt-1 touch-manipulation"
        isLoading={isPending} disabled={isPending || recipients.length === 0}
      >
        {!isPending && <Send className="h-4 w-4" />}
        {!isPending && (recipients.length === 0 ? 'Select recipients first' : `Announce to ${recipients.length} recipient${recipients.length !== 1 ? 's' : ''}`)}
      </Button>
    </form>
  );
}
