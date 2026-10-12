'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { usePathname } from 'next/navigation';
import { Loader2, MessageCircle, Send, X } from 'lucide-react';
import { submitFeedbackAction } from '@/app/(app)/feedback/actions';
import { cn } from '@/lib/utils';

/** Floating chat-style feedback button + panel (bottom-right). */
export function FeedbackWidget({ firstName }: { firstName: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sending, startSend] = useTransition();
  const textRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) textRef.current?.focus();
  }, [open]);

  function send() {
    const text = message.trim();
    if (!text) return;
    setError(null);
    startSend(async () => {
      const res = await submitFeedbackAction({ message: text, page: pathname });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setSent(text);
      setMessage('');
    });
  }

  return (
    <div className="fixed bottom-5 right-5 z-40 flex flex-col items-end gap-3">
      {open && (
        <div
          role="dialog"
          aria-label="Send feedback"
          className="flex w-[calc(100vw-2.5rem)] max-w-sm flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between bg-[#0C447C] px-4 py-3 text-white">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15">
                <MessageCircle className="h-4 w-4" />
              </span>
              <div>
                <p className="text-[14px] font-semibold leading-tight">Feedback</p>
                <p className="text-[11px] text-white/70">Goes straight to the HR portal team</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close feedback"
              className="rounded-full p-1.5 text-white/80 transition hover:bg-white/15 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Conversation */}
          <div className="flex max-h-72 flex-col gap-2.5 overflow-y-auto bg-slate-50 px-4 py-4">
            <div className="max-w-[85%] self-start rounded-2xl rounded-tl-sm bg-white px-3.5 py-2.5 text-[13px] text-slate-700 shadow-sm ring-1 ring-slate-100">
              Hi {firstName} 👋 How&apos;s the HR portal working for you? Ideas, bugs or anything that felt
              confusing — tell us here.
            </div>
            {sent && (
              <>
                <div className="max-w-[85%] self-end whitespace-pre-wrap rounded-2xl rounded-tr-sm bg-[#0C447C] px-3.5 py-2.5 text-[13px] text-white">
                  {sent}
                </div>
                <div className="max-w-[85%] self-start rounded-2xl rounded-tl-sm bg-white px-3.5 py-2.5 text-[13px] text-slate-700 shadow-sm ring-1 ring-slate-100">
                  Thanks! Your feedback has been sent. 🙌
                </div>
              </>
            )}
          </div>

          {/* Composer */}
          <div className="border-t border-slate-100 p-3">
            {error && <p className="mb-2 text-[12px] text-red-600">{error}</p>}
            <div className="flex items-end gap-2">
              <textarea
                ref={textRef}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                rows={2}
                maxLength={2000}
                placeholder={sent ? 'Anything else?' : 'Write your feedback…'}
                className="min-h-[44px] flex-1 resize-none rounded-xl border border-slate-200 px-3 py-2 text-base text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#0C447C] focus:ring-2 focus:ring-[#0C447C]/15 sm:text-[13px]"
              />
              <button
                type="button"
                onClick={send}
                disabled={sending || !message.trim()}
                aria-label="Send feedback"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#0C447C] text-white transition hover:bg-[#0a3a6a] disabled:opacity-40"
              >
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </button>
            </div>
            <p className="mt-1.5 text-[10px] text-slate-400">Enter to send · Shift+Enter for a new line</p>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={cn(
          'flex items-center gap-2 rounded-full bg-[#0C447C] px-4 py-3 text-[13px] font-semibold text-white shadow-lg shadow-[#0C447C]/30 transition hover:bg-[#0a3a6a] active:scale-95',
          open && 'px-3',
        )}
      >
        {open ? <X className="h-5 w-5" /> : <MessageCircle className="h-5 w-5" />}
        {!open && <span>Feedback</span>}
      </button>
    </div>
  );
}
