'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { Bell, CheckCheck, ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { markNotificationsReadAction, clearAllNotificationsAction } from '@/app/(app)/notifications/actions';
import type { NavNotification } from '@/components/layout/top-navbar';
import { cn } from '@/lib/utils';

const TONE_STYLES: Record<NavNotification['tone'], { dot: string }> = {
  info: { dot: 'bg-blue-500' },
  success: { dot: 'bg-emerald-500' },
  warning: { dot: 'bg-red-500' },
};

function timeAgo(date: Date): string {
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

interface Props {
  notifications: NavNotification[];
}

export function NotificationsList({ notifications }: Props) {
  const router = useRouter();
  const [allRead, setAllRead] = useState(false);
  const [cleared, setCleared] = useState(false);
  const [isPending, startTransition] = useTransition();

  const unreadCount = allRead ? 0 : notifications.filter((n) => !n.read).length;

  function handleMarkAllRead() {
    setAllRead(true);
    startTransition(async () => {
      await markNotificationsReadAction().catch(() => {});
      router.refresh();
    });
  }

  function handleClearAll() {
    setCleared(true);
    startTransition(async () => {
      await clearAllNotificationsAction().catch(() => {});
      router.refresh();
    });
  }

  if (notifications.length === 0 || cleared) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-slate-100 bg-white py-20">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
          <Bell className="h-5 w-5 text-slate-400" />
        </div>
        <p className="text-sm text-slate-400">You&apos;re all caught up</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-100 bg-white">
      {/* Header row */}
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 sm:px-5">
        {unreadCount > 0 ? (
          <span className="text-xs font-semibold text-[#0C447C]">{unreadCount} unread</span>
        ) : (
          <span className="text-xs text-slate-400">All caught up</span>
        )}
        <div className="flex items-center gap-3">
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={handleMarkAllRead}
              disabled={isPending}
              className="flex items-center gap-1 text-xs font-medium text-slate-500 transition hover:text-slate-900 disabled:opacity-50"
            >
              <CheckCheck size={13} />
              Mark all read
            </button>
          )}
          <button
            type="button"
            onClick={handleClearAll}
            disabled={isPending}
            className="text-xs font-medium text-slate-400 transition hover:text-red-500 disabled:opacity-50"
          >
            Clear all
          </button>
        </div>
      </div>

      {/* List */}
      <ul className="divide-y divide-slate-50">
        {notifications.map((n) => {
          const isUnread = !allRead && !n.read;
          const tone = TONE_STYLES[n.tone];

          const inner = (
            <div className="flex items-start gap-3 px-4 py-3.5 sm:px-5">
              <span className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', tone.dot)} />
              <div className="min-w-0 flex-1">
                <p
                  className={cn(
                    'text-sm leading-snug',
                    isUnread ? 'font-semibold text-slate-900' : 'font-medium text-slate-500',
                  )}
                >
                  {n.title}
                </p>
                <p className="mt-0.5 text-xs text-slate-400">{timeAgo(n.createdAt)}</p>
              </div>
              {isUnread && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#0C447C]" />}
              {n.href && (
                <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-slate-300" />
              )}
            </div>
          );

          return n.href ? (
            <li key={n.id}>
              <Link
                href={n.href}
                className={cn(
                  'block transition-colors',
                  isUnread ? 'bg-[#F5F9FF] hover:bg-[#EEF5FF]' : 'hover:bg-slate-50',
                )}
              >
                {inner}
              </Link>
            </li>
          ) : (
            <li key={n.id} className={cn(isUnread && 'bg-[#F5F9FF]')}>
              {inner}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
