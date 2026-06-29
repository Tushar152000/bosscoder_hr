'use client';

import { useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarDays, Lock, Pencil, RefreshCw, Send, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDialog } from '@/components/ui/modal';
import {
  closeCycleAction,
  openCycleAction,
  resendCycleOpenEmailsAction,
  sendCycleTestEmailAction,
  syncCycleEmployeesAction,
  updateCycleDueDateAction,
} from '@/app/(app)/performance/actions';

export function EditCycleDueDateButton({
  cycleId,
  currentDueDate,
}: {
  cycleId: string;
  currentDueDate: Date | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const today = new Date().toISOString().slice(0, 10);
  const existing = currentDueDate
    ? currentDueDate.toISOString().slice(0, 10)
    : '';

  function handleSave() {
    const val = inputRef.current?.value ?? null;
    setError(null);
    start(async () => {
      const r = await updateCycleDueDateAction(cycleId, val || null);
      if (!r.ok) { setError(r.error); return; }
      setOpen(false);
      router.refresh();
    });
  }

  function handleClear() {
    setError(null);
    start(async () => {
      const r = await updateCycleDueDateAction(cycleId, null);
      if (!r.ok) { setError(r.error); return; }
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
        <Pencil className="h-3.5 w-3.5" />
        Edit due date
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-sm rounded-xl border border-[#E2E8F0] bg-white p-5 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="grid h-7 w-7 place-items-center rounded-md bg-[#EBF3FE]">
                  <CalendarDays className="h-[15px] w-[15px] text-[#0C447C]" />
                </div>
                <p className="text-[14px] font-medium text-slate-900">Edit due date</p>
              </div>
              <button
                type="button"
                onClick={() => { setOpen(false); setError(null); }}
                className="grid h-6 w-6 place-items-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="mb-3 text-[12px] text-slate-500">
              Set or clear the submission deadline for this cycle. Employees will see "Due in X days" based on this date.
            </p>

            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] font-medium text-slate-700">
                Submission due date <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <input
                ref={inputRef}
                type="date"
                defaultValue={existing}
                min={today}
                className="h-10 w-full rounded-md border border-[#E2E8F0] bg-white px-3 text-[13px] text-slate-900 focus:border-[#0C447C] focus:outline-none focus:ring-2 focus:ring-[#0C447C]/20"
              />
              <p className="text-[11px] text-slate-400">
                Leave blank to fall back to end of month/quarter.
              </p>
            </div>

            {error && (
              <div className="mt-3 rounded-md border border-[#FAC8C6] bg-[#FAECE7] px-3 py-2 text-[12px] text-[#993C1D]">
                {error}
              </div>
            )}

            <div className="mt-4 flex items-center gap-2">
              <Button
                type="button"
                variant="primary"
                className="flex-1"
                isLoading={isPending}
                onClick={handleSave}
              >
                {!isPending && 'Save'}
              </Button>
              {existing && (
                <Button
                  type="button"
                  variant="secondary"
                  disabled={isPending}
                  onClick={handleClear}
                >
                  Clear
                </Button>
              )}
              <Button
                type="button"
                variant="secondary"
                disabled={isPending}
                onClick={() => { setOpen(false); setError(null); }}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function OpenCycleButton({ cycleId }: { cycleId: string }) {
  const router = useRouter();
  const [isPending, start] = useTransition();
  const { alert, dialog } = useDialog();
  return (
    <>
      {dialog}
      <Button
        variant="primary"
        isLoading={isPending}
        onClick={() =>
          start(async () => {
            const r = await openCycleAction(cycleId);
            if (!r.ok)
              await alert({ title: 'Could not open cycle', body: r.error, intent: 'danger' });
            router.refresh();
          })
        }
      >
        {!isPending && <Send className="h-3.5 w-3.5" />}
        {!isPending && 'Open cycle'}
      </Button>
    </>
  );
}

export function SyncEmployeesButton({ cycleId }: { cycleId: string }) {
  const router = useRouter();
  const [isPending, start] = useTransition();
  const { alert, dialog } = useDialog();
  return (
    <>
      {dialog}
      <Button
        variant="secondary"
        size="sm"
        isLoading={isPending}
        onClick={() =>
          start(async () => {
            const r = await syncCycleEmployeesAction(cycleId);
            if (!r.ok) await alert({ title: 'Sync failed', body: r.error, intent: 'danger' });
            router.refresh();
          })
        }
      >
        {!isPending && <RefreshCw className="h-3.5 w-3.5" />}
        {!isPending && 'Sync new employees'}
      </Button>
    </>
  );
}

export function SendTestCycleEmailButton({ cycleId }: { cycleId: string }) {
  const [isPending, start] = useTransition();
  const { alert, dialog } = useDialog();
  return (
    <>
      {dialog}
      <Button
        variant="secondary"
        size="sm"
        disabled={isPending}
        onClick={() =>
          start(async () => {
            const r = await sendCycleTestEmailAction(cycleId);
            if (!r.ok) {
              await alert({ title: 'Test send failed', body: r.error, intent: 'danger' });
              return;
            }
            await alert({
              title: 'Test sent',
              body: `A sample of this cycle's email was sent to ${r.data.email}. Check your inbox before sending to everyone.`,
            });
          })
        }
      >
        {!isPending && <Send className="h-3.5 w-3.5" />}
        {isPending ? 'Sending…' : 'Send test to me'}
      </Button>
    </>
  );
}

export function ResendCycleEmailsButton({
  cycleId,
  cycleName,
}: {
  cycleId: string;
  cycleName: string;
}) {
  const [isPending, start] = useTransition();
  const { confirm, alert, dialog } = useDialog();
  return (
    <>
      {dialog}
      <Button
        variant="secondary"
        size="sm"
        disabled={isPending}
        onClick={async () => {
          const ok = await confirm({
            title: `Email all ${cycleName} participants?`,
            body: (
              <span>
                Everyone assigned a form in this cycle will get the
                &ldquo;performance cycle is open&rdquo; email with their link.
                Use this if the launch emails didn&apos;t go out.
              </span>
            ),
            confirmLabel: 'Send emails',
          });
          if (!ok) return;
          start(async () => {
            const r = await resendCycleOpenEmailsAction(cycleId);
            if (!r.ok) {
              await alert({ title: 'Could not send', body: r.error, intent: 'danger' });
              return;
            }
            await alert({
              title: 'Emails sent',
              body: `${r.data.sent} of ${r.data.attempted} delivered${
                r.data.failed ? ` · ${r.data.failed} failed` : ''
              }.`,
            });
          });
        }}
      >
        {!isPending && <Send className="h-3.5 w-3.5" />}
        {isPending ? 'Sending…' : 'Resend emails'}
      </Button>
    </>
  );
}

export function CloseCycleButton({ cycleId }: { cycleId: string }) {
  const router = useRouter();
  const [isPending, start] = useTransition();
  const { confirm, alert, dialog } = useDialog();
  return (
    <>
      {dialog}
      <Button
        variant="danger"
        size="sm"
        disabled={isPending}
        onClick={async () => {
          const ok = await confirm({
            title: 'Close this cycle?',
            body: (
              <span>
                All forms will be locked and no further submissions or edits will be allowed.
                This can&apos;t be undone.
              </span>
            ),
            confirmLabel: 'Close cycle',
            intent: 'danger',
          });
          if (!ok) return;
          start(async () => {
            const r = await closeCycleAction(cycleId);
            if (!r.ok)
              await alert({ title: 'Could not close cycle', body: r.error, intent: 'danger' });
            router.refresh();
          });
        }}
      >
        <Lock className="h-3.5 w-3.5" />
        {isPending ? 'Closing…' : 'Close cycle'}
      </Button>
    </>
  );
}
