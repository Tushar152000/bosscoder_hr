'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { Bell, CheckCheck, ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { markNotificationsReadAction, clearAllNotificationsAction } from '@/app/(app)/notifications/actions';
import type { NavNotification } from '@/components/layout/top-navbar';
import { cn } from '@/lib/utils';

const TONE_DOT: Record<NavNotification['tone'], string> = {
  info: 'bg-blue-500',
  success: 'bg-emerald-500',
  warning: 'bg-red-500',
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Relative time for the last week ("3h ago", "2d ago"), a date after that ("21 Jun"). */
function when(date: Date): string {
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 7 * 86400) return `${Math.floor(diff / 86400)}d ago`;
  // UTC getters so server and client render the same string (see lib/format).
  const sameYear = date.getUTCFullYear() === new Date().getUTCFullYear();
  return `${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]}${sameYear ? '' : ` ${date.getUTCFullYear()}`}`;
}

interface Props {
  notifications: NavNotification[];
  /** Borderless, full-height layout for the slide-over sheet (vs. a card on the page). */
  embedded?: boolean;
  /** Called when a notification link is followed — lets the sheet close itself. */
  onNavigate?: () => void;
}

export function NotificationsList({ notifications, embedded = false, onNavigate }: Props) {
  const router = useRouter();
  const [allRead, setAllRead] = useState(false);
  const [cleared, setCleared] = useState(false);
  const [isPending, startTransition] = useTransition();

  const isUnread = (n: NavNotification) => !allRead && !n.read;
  const unread = notifications.filter(isUnread);
  const earlier = notifications.filter((n) => !isUnread(n));

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
      <div
        className={cn(
          'flex flex-col items-center justify-center gap-3 py-20',
          !embedded && 'rounded-2xl border border-slate-100 bg-white',
        )}
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
          <Bell className="h-5 w-5 text-slate-400" />
        </div>
        <p className="text-sm font-medium text-slate-600">You&apos;re all caught up</p>
        <p className="-mt-2 text-xs text-slate-400">New updates will show up here.</p>
      </div>
    );
  }

  function renderItem(n: NavNotification) {
    const unreadItem = isUnread(n);
    const inner = (
      <div className="flex items-start gap-3 px-4 py-3 sm:px-5">
        <span className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', TONE_DOT[n.tone])} />
        <div className="min-w-0 flex-1">
          <p
            className={cn(
              'text-[13px] leading-snug',
              unreadItem ? 'font-semibold text-slate-900' : 'text-slate-600',
            )}
          >
            {n.title}
          </p>
          <p className="mt-1 text-[11px] text-slate-400">{when(n.createdAt)}</p>
        </div>
        {n.href && <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-slate-300" />}
      </div>
    );

    return n.href ? (
      <li key={n.id}>
        <Link
          href={n.href}
          onClick={onNavigate}
          className={cn(
            'block transition-colors',
            unreadItem ? 'bg-[#F5F9FF] hover:bg-[#EEF5FF]' : 'hover:bg-slate-50',
          )}
        >
          {inner}
        </Link>
      </li>
    ) : (
      <li key={n.id} className={cn(unreadItem && 'bg-[#F5F9FF]')}>
        {inner}
      </li>
    );
  }

  function section(label: string, items: NavNotification[]) {
    if (items.length === 0) return null;
    return (
      <section>
        <h3 className="px-4 pb-1.5 pt-4 text-[10px] font-semibold uppercase tracking-widest text-slate-400 sm:px-5">
          {label}
        </h3>
        <ul className="divide-y divide-slate-50">{items.map(renderItem)}</ul>
      </section>
    );
  }

  return (
    <div className={cn(!embedded && 'rounded-2xl border border-slate-100 bg-white pb-2')}>
      {/* Header row */}
      <div
        className={cn(
          'flex items-center justify-between border-b border-slate-100 px-4 py-2.5 sm:px-5',
          embedded && 'sticky top-0 z-10 bg-white',
        )}
      >
        {unread.length > 0 ? (
          <span className="text-xs font-semibold text-[#0C447C]">{unread.length} unread</span>
        ) : (
          <span className="text-xs text-slate-400">All caught up</span>
        )}
        <div className="flex items-center gap-3">
          {unread.length > 0 && (
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

      {section('New', unread)}
      {section('Earlier', earlier)}
    </div>
  );
}
