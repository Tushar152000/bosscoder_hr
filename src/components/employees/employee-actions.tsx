'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';
import { useDialog } from '@/components/ui/modal';
import {
  deactivateEmployeeAction,
  deleteEmployeeAction,
} from '@/app/(app)/directory/actions';

export function DeactivateEmployeeButton({
  employeeId,
  displayName,
}: {
  employeeId: string;
  displayName: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const { confirm, alert, dialog } = useDialog();
  return (
    <>
      {dialog}
      <button
        type="button"
        disabled={pending}
        onClick={async () => {
          const ok = await confirm({
            title: `Mark ${displayName} as left?`,
            body: 'Their record stays in the directory but moves to "Left" status.',
            confirmLabel: 'Mark as left',
          });
          if (!ok) return;
          start(async () => {
            const res = await deactivateEmployeeAction(employeeId);
            if (!res.ok)
              await alert({ title: 'Could not update employee', body: res.error, intent: 'danger' });
            router.refresh();
          });
        }}
        className="bg-white border border-slate-200/70 rounded-lg px-3 py-1.5 text-[12px] font-medium text-slate-700 hover:bg-slate-50 transition disabled:opacity-60"
      >
        {pending ? 'Saving…' : 'Mark as left'}
      </button>
    </>
  );
}

export function DeleteEmployeeButton({
  employeeId,
  displayName,
}: {
  employeeId: string;
  displayName: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const { promptText, alert, dialog } = useDialog();
  return (
    <>
      {dialog}
      <button
        type="button"
        disabled={pending}
        onClick={async () => {
          const result = await promptText({
            title: `Delete ${displayName}?`,
            body: 'This permanently removes the employee from the directory. Existing review submissions keep their name/email but lose the directory link. This cannot be undone.',
            expected: 'DELETE',
            confirmLabel: 'Delete permanently',
            intent: 'danger',
          });
          if (result !== 'DELETE') return;
          start(async () => {
            const res = await deleteEmployeeAction(employeeId);
            if (!res.ok) {
              await alert({ title: 'Delete failed', body: res.error, intent: 'danger' });
              return;
            }
            router.push('/directory');
            router.refresh();
          });
        }}
        className="flex items-center gap-1.5 bg-red-50 border border-red-200 rounded-lg px-3 py-1.5 text-[12px] font-medium text-red-700 hover:bg-red-100 transition disabled:opacity-60"
      >
        <Trash2 size={12} />
        {pending ? 'Deleting…' : 'Delete'}
      </button>
    </>
  );
}
