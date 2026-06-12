'use client';

import { useState, useTransition } from 'react';
import { Bell, Loader2, CheckCheck } from 'lucide-react';
import { sendDocumentReminderAction } from '@/app/(app)/settings/employee-documents/actions';

interface Props {
  uid: string;
  docType: string;
}

export function RemindButton({ uid, docType }: Props) {
  const [sent, setSent] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      const fd = new FormData();
      fd.append('uid', uid);
      fd.append('docType', docType);
      await sendDocumentReminderAction(fd);
      setSent(true);
      setTimeout(() => setSent(false), 3500);
    });
  }

  if (sent) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm">
        <CheckCheck className="w-3 h-3 shrink-0" />
        Sent!
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      title="Send upload reminder notification"
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 hover:border-amber-300 hover:shadow-sm active:scale-95 disabled:opacity-50 transition-all duration-150"
    >
      {isPending ? (
        <Loader2 className="w-3 h-3 shrink-0 animate-spin" />
      ) : (
        <Bell className="w-3 h-3 shrink-0" />
      )}
      {isPending ? 'Sending…' : 'Remind'}
    </button>
  );
}
