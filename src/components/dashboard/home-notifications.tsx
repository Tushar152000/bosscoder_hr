'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { Bell, CheckCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { markNotificationsReadAction } from '@/app/(app)/notifications/actions';
import type { NavNotification } from '@/components/layout/top-navbar';
import { cn } from '@/lib/utils';

const TONE_DOT: Record<NavNotification['tone'], string> = {
  info: 'bg-blue-500',
  success: 'bg-emerald-500',
  warning: 'bg-red-500',
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

export function HomeNotifications({ notifications }: Props) {
  const router = useRouter();
  const [allRead, setAllRead] = useState(false);
  const [isPending, startTransition] = useTransition();

  const unreadCount = allRead ? 0 : notifications.filter((n) => !n.read).length;

  function handleMarkAllRead() {
    setAllRead(true);
    startTransition(async () => {
      await markNotificationsReadAction().catch(() => {});
      router.refresh();
    });
  }

  if (notifications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-6 gap-2">
        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
          <Bell className="h-4 w-4 text-slate-400" />
        </div>
        <p className="text-[11px] text-slate-400">No notifications yet</p>
      </div>
    );
  }

  return (
    <div>
      {/* header row */}
      <div className="flex items-center justify-between mb-2">
        {unreadCount > 0 ? (
          <span className="text-[10px] font-semibold text-[#0C447C] bg-[#E6F1FB] px-1.5 py-0.5 rounded-full">
            {unreadCount} unread
          </span>
        ) : (
          <span className="text-[10px] text-slate-400">All caught up</span>
        )}
        {unreadCount > 0 && (
          <button
            type="button"
            onClick={handleMarkAllRead}
            disabled={isPending}
            className="flex items-center gap-1 text-[10px] font-medium text-slate-500 hover:text-slate-900 transition disabled:opacity-50"
          >
            <CheckCheck size={11} />
            Mark all read
          </button>
        )}
      </div>

      {/* list */}
      <ul className="flex flex-col gap-0.5">
        {notifications.slice(0, 6).map((n) => {
          const isUnread = !allRead && !n.read;
          const inner = (
            <div className="flex items-start gap-2 w-full">
              <span className={cn('mt-1.5 w-1.5 h-1.5 rounded-full shrink-0', TONE_DOT[n.tone])} />
              <div className="flex-1 min-w-0">
                <p className={cn('text-[11px] leading-snug truncate', isUnread ? 'font-semibold text-slate-900' : 'font-medium text-slate-600')}>
                  {n.title}
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">{timeAgo(n.createdAt)}</p>
              </div>
              {isUnread && <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />}
            </div>
          );

          return n.href ? (
            <li key={n.id}>
              <Link
                href={n.href}
                className="flex rounded-md px-2 py-2 hover:bg-slate-50 transition-colors"
              >
                {inner}
              </Link>
            </li>
          ) : (
            <li key={n.id} className="flex rounded-md px-2 py-2">
              {inner}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
