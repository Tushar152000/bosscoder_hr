'use client';

import { useState, useTransition } from 'react';
import { CheckCircle2, EyeOff, Loader2, Send } from 'lucide-react';
import { submitHrFeedbackAction } from '@/app/(app)/hr-feedback/actions';
import { cn } from '@/lib/utils';
import {
  CATEGORY_COLOR,
  CATEGORY_LABEL,
  HR_FEEDBACK_CATEGORIES,
  MESSAGE_MAX,
  type HrFeedbackCategory,
} from '@/lib/hr-feedback/types';

export function HrFeedbackSendForm({ sender }: { sender: { name: string; initials: string; color: string; photoURL: string | null } }) {
  const [category, setCategory] = useState<HrFeedbackCategory | null>(null);
  const [message, setMessage] = useState('');
  const [anonymous, setAnonymous] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<{ anonymous: boolean } | null>(null);
  const [sending, startSend] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!category) { setError('Pick what this is about'); return; }
    if (message.trim().length < 10) { setError('Write a little more so HR can act on it'); return; }
    setError(null);
    startSend(async () => {
      const res = await submitHrFeedbackAction({ category, message, anonymous });
      if (!res.ok) { setError(res.error); return; }
      setSent({ anonymous });
      setMessage('');
      setCategory(null);
      setAnonymous(false);
    });
  }

  if (sent) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-slate-200 bg-white px-6 py-10 text-center">
        <span className="grid h-12 w-12 place-items-center rounded-full bg-[#E1F5EE]">
          <CheckCircle2 className="h-6 w-6 text-[#1D9E75]" />
        </span>
        <div>
          <p className="text-[16px] font-semibold text-slate-900">Sent to HR</p>
          <p className="mx-auto mt-1 max-w-sm text-[13px] text-slate-500">
            {sent.anonymous
              ? 'Your message was sent without your name. HR can read it but can’t reply to you.'
              : 'You’ll get a notification when HR replies or resolves it. It’s listed under Your messages.'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setSent(null)}
          className="mt-1 h-9 rounded-lg border border-slate-200 bg-white px-4 text-[13px] font-semibold text-slate-800 transition hover:bg-slate-50"
        >
          Send another
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5">
      <fieldset>
        <legend className="mb-2 text-[13px] font-semibold text-slate-900">What is it about?</legend>
        <div className="flex flex-wrap gap-2">
          {HR_FEEDBACK_CATEGORIES.map((c) => {
            const on = category === c;
            return (
              <button
                key={c}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => { setCategory(c); setError(null); }}
                className={cn(
                  'inline-flex h-9 items-center gap-2 rounded-full border px-3.5 text-[13px] font-medium transition',
                  on
                    ? 'border-[#0C447C] bg-[#0C447C] text-white'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300',
                )}
              >
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: on ? '#fff' : CATEGORY_COLOR[c] }} />
                {CATEGORY_LABEL[c]}
              </button>
            );
          })}
        </div>
      </fieldset>

      <div>
        <label htmlFor="hr-feedback-message" className="mb-2 block text-[13px] font-semibold text-slate-900">
          Your message
        </label>
        <textarea
          id="hr-feedback-message"
          value={message}
          onChange={(e) => { setMessage(e.target.value); setError(null); }}
          rows={6}
          maxLength={MESSAGE_MAX}
          placeholder="What happened, or what would you change? Specific examples help HR act on it."
          className="w-full resize-y rounded-xl border border-slate-200 px-3.5 py-3 text-base leading-relaxed text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#0C447C] focus:ring-2 focus:ring-[#0C447C]/15 sm:text-[14px]"
        />
        <p className="mt-1 text-right text-[11.5px] tabular-nums text-slate-400">
          {message.length} / {MESSAGE_MAX}
        </p>
      </div>

      <label
        className={cn(
          'flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition',
          anonymous ? 'border-[#B5D4F4] bg-[#EBF3FE]' : 'border-slate-200 hover:bg-slate-50',
        )}
      >
        <input
          type="checkbox"
          checked={anonymous}
          onChange={(e) => setAnonymous(e.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 accent-[#0C447C]"
        />
        <span>
          <span className="flex items-center gap-1.5 text-[13.5px] font-semibold text-slate-900">
            <EyeOff className="h-3.5 w-3.5" /> Send anonymously
          </span>
          <span className="mt-0.5 block text-[12.5px] leading-relaxed text-slate-500">
            Your name, email and department aren’t saved with the message, so HR can’t see who sent it. HR
            also can’t reply to you, and it won’t appear under Your messages.
          </span>
        </span>
      </label>

      {error && <p className="text-[13px] font-medium text-red-600" role="alert">{error}</p>}

      <div className="flex items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-[12.5px] text-slate-500">
          {anonymous ? (
            <>
              <span className="grid h-6 w-6 place-items-center rounded-full bg-slate-100 text-slate-500">
                <EyeOff className="h-3.5 w-3.5" />
              </span>
              Sending without your name
            </>
          ) : (
            <>
              {sender.photoURL ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={sender.photoURL} alt="" referrerPolicy="no-referrer" className="h-6 w-6 rounded-full object-cover" />
              ) : (
                <span
                  className="grid h-6 w-6 place-items-center rounded-full text-[9.5px] font-semibold text-white"
                  style={{ backgroundColor: sender.color }}
                >
                  {sender.initials}
                </span>
              )}
              Sending as {sender.name}
            </>
          )}
        </p>
        <button
          type="submit"
          disabled={sending}
          className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#0C447C] px-5 text-[13.5px] font-semibold text-white transition hover:bg-[#0A3A6A] disabled:opacity-60"
        >
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Send to HR
        </button>
      </div>
    </form>
  );
}
