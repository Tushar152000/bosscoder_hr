'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, RefreshCw, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDialog } from '@/components/ui/modal';
import {
  closeCycleAction,
  openCycleAction,
  syncCycleEmployeesAction,
} from '@/app/(app)/performance/actions';

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
