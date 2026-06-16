'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { Bell, CheckCheck, ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { markNotificationsReadAction, clearAllNotificationsAction } from '@/app/(app)/notifications/actions';
import type { NavNotification } from '@/components/layout/top-navbar';
import { cn } from '@/lib/utils';

const TONE_STYLES: Record<NavNotification['tone'], { dot: string; bg: string }> = {
  info:    { dot: 'bg-blue-500',    bg: 'bg-blue-50' },
  success: { dot: 'bg-emerald-500', bg: 'bg-emerald-50' },
  warning: { dot: 'bg-red-500',     bg: 'bg-red-50' },
};

function timeAgo(date: Date): string {
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

const PREVIEW_COUNT = 3;

interface Props {
  notifications: NavNotification[];
}

export function HomeNotifications({ notifications }: Props) {
  const router = useRouter();
  const [allRead, setAllRead] = useState(false);
  const [cleared, setCleared] = useState(false);
  const [isPending, startTransition] = useTransition();

  const unreadCount = allRead ? 0 : notifications.filter((n) => !n.read).length;
  const preview = notifications.slice(0, PREVIEW_COUNT);
  const remaining = notifications.length - PREVIEW_COUNT;

  function handleMarkAllRead() {
    setAllRead(true);
    startTransition(async () => {
      await markNotificationsReadAction().catch(() => {});
      router.refresh();
    });
  }

  function handleClearAll() {
    setCleared(true);
    clearAllNotificationsAction().catch(() => {});
  }

  if (notifications.length === 0 || cleared) {
    return (
      <div className="flex flex-col items-center justify-center py-6 gap-2">
        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
          <Bell className="h-4 w-4 text-slate-400" />
        </div>
        <p className="text-[11px] text-slate-400">All caught up</p>
      </div>
    );
  }

  return (
    <div>
      {/* Quick actions */}
      <div className="flex items-center justify-between mb-2 pt-1">
        {unreadCount > 0 ? (
          <span className="text-[10px] font-semibold text-[#0C447C]">
            {unreadCount} unread
          </span>
        ) : (
          <span className="text-[10px] text-slate-400">All caught up</span>
        )}
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={handleMarkAllRead}
              disabled={isPending}
              className="flex items-center gap-1 text-[10px] font-medium text-slate-500 hover:text-slate-900 transition disabled:opacity-50"
            >
              <CheckCheck size={11} />
              Mark read
            </button>
          )}
          <button
            type="button"
            onClick={handleClearAll}
            className="text-[10px] font-medium text-slate-400 hover:text-red-500 transition"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Preview list */}
      <ul className="flex flex-col gap-0.5">
        {preview.map((n) => {
          const isUnread = !allRead && !n.read;
          const tone = TONE_STYLES[n.tone];

          const inner = (
            <div className="flex items-start gap-2.5 w-full">
              {/* tone dot */}
              <span
                className={cn(
                  'mt-1 w-1.5 h-1.5 rounded-full shrink-0',
                  tone.dot,
                )}
              />
              <div className="flex-1 min-w-0">
                <p
                  className={cn(
                    'text-[11.5px] leading-snug',
                    isUnread
                      ? 'font-semibold text-slate-900'
                      : 'font-medium text-slate-500',
                  )}
                >
                  {n.title}
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">{timeAgo(n.createdAt)}</p>
              </div>
              {isUnread && (
                <span className="mt-1 w-1.5 h-1.5 rounded-full bg-[#0C447C] shrink-0" />
              )}
            </div>
          );

          return n.href ? (
            <li key={n.id}>
              <Link
                href={n.href}
                className={cn(
                  'flex rounded-lg px-2 py-2 transition-colors',
                  isUnread ? 'bg-[#F5F9FF] hover:bg-[#EEF5FF]' : 'hover:bg-slate-50',
                )}
              >
                {inner}
              </Link>
            </li>
          ) : (
            <li
              key={n.id}
              className={cn(
                'flex rounded-lg px-2 py-2',
                isUnread ? 'bg-[#F5F9FF]' : '',
              )}
            >
              {inner}
            </li>
          );
        })}
      </ul>

      {/* View all footer */}
      <Link
        href="/notifications"
        className="mt-2 flex items-center justify-between w-full px-2 py-2 rounded-lg text-[11px] font-medium text-[#0C447C] hover:bg-[#EEF5FF] transition-colors group"
      >
        <span>
          {remaining > 0
            ? `View all · ${notifications.length} notifications`
            : 'View all notifications'}
        </span>
        <ChevronRight className="w-3.5 h-3.5 text-[#0C447C]/60 group-hover:translate-x-0.5 transition-transform" />
      </Link>
    </div>
  );
}
