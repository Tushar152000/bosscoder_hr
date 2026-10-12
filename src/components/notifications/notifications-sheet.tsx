'use client';

import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { NavNotification } from '@/components/layout/top-navbar';
import { NotificationsList } from './notifications-list';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  notifications: NavNotification[];
  /** Edge the sheet slides in from — match where it was opened. */
  side?: 'left' | 'right';
}

/** All notifications in a right-hand slide-over, so viewing them doesn't leave the page. */
export function NotificationsSheet({ open, onOpenChange, notifications, side = 'right' }: Props) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-slate-900/30 backdrop-blur-[2px] data-[state=closed]:animate-fade-out data-[state=open]:animate-fade-in motion-reduce:animate-none" />
        <Dialog.Content
          aria-describedby={undefined}
          className={cn(
            'fixed inset-y-0 z-50 flex w-full flex-col bg-white shadow-2xl outline-none will-change-transform motion-reduce:animate-none sm:max-w-md',
            side === 'left'
              ? 'left-0 sheet-from-left sm:rounded-r-2xl'
              : 'right-0 data-[state=closed]:animate-sheet-out data-[state=open]:animate-sheet-in sm:rounded-l-2xl',
          )}
        >
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-4 sm:px-5">
            <Dialog.Title className="text-[17px] font-semibold text-slate-900">Notifications</Dialog.Title>
            <Dialog.Close
              aria-label="Close notifications"
              className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            >
              <X className="h-4 w-4" />
            </Dialog.Close>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-[env(safe-area-inset-bottom)]">
            <NotificationsList
              notifications={notifications}
              embedded
              onNavigate={() => onOpenChange(false)}
            />
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
