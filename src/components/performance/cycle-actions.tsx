'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useDialog } from '@/components/ui/modal';
import {
  closeCycleAction,
  openCycleAction,
  syncCycleEmployeesAction,
} from '@/app/(app)/performance/actions';

export function OpenCycleButton({ cycleId }: { cycleId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const { alert, dialog } = useDialog();
  return (
    <>
      {dialog}
      <Button
        onClick={() =>
          start(async () => {
            const r = await openCycleAction(cycleId);
            if (!r.ok) await alert({ title: 'Could not open cycle', body: r.error, intent: 'danger' });
            router.refresh();
          })
        }
        disabled={pending}
      >
        {pending ? 'Opening…' : 'Open cycle'}
      </Button>
    </>
  );
}

export function CloseCycleButton({ cycleId }: { cycleId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const { confirm, alert, dialog } = useDialog();
  return (
    <>
      {dialog}
      <Button
        variant="danger"
        onClick={async () => {
          const ok = await confirm({
            title: 'Close this cycle?',
            body: 'All in-progress forms will be locked and become read-only. This cannot be undone.',
            confirmLabel: 'Close cycle',
            intent: 'danger',
          });
          if (!ok) return;
          start(async () => {
            const r = await closeCycleAction(cycleId);
            if (!r.ok) await alert({ title: 'Could not close cycle', body: r.error, intent: 'danger' });
            router.refresh();
          });
        }}
        disabled={pending}
      >
        {pending ? 'Closing…' : 'Close cycle'}
      </Button>
    </>
  );
}

export function SyncEmployeesButton({ cycleId }: { cycleId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const { alert, dialog } = useDialog();
  return (
    <>
      {dialog}
      <Button
        variant="outline"
        size="sm"
        onClick={() =>
          start(async () => {
            const r = await syncCycleEmployeesAction(cycleId);
            if (!r.ok) await alert({ title: 'Sync failed', body: r.error, intent: 'danger' });
            router.refresh();
          })
        }
        disabled={pending}
      >
        {pending ? 'Syncing…' : 'Sync new employees'}
      </Button>
    </>
  );
}
