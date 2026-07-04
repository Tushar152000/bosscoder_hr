import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { requireUser } from '@/lib/auth/guard';
import { listNotificationsForUser } from '@/lib/firestore/notifications';
import { NotificationsList } from '@/components/notifications/notifications-list';

export const metadata = { title: 'Notifications' };

export default async function NotificationsPage() {
  const user = await requireUser();
  const notifications = await listNotificationsForUser(user.uid);

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6 md:px-10">
      <Link
        href="/"
        className="mb-5 inline-flex items-center gap-1 text-xs font-medium text-slate-500 transition hover:text-slate-900"
      >
        <ChevronLeft size={14} />
        Back to home
      </Link>

      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">Notifications</h1>
        <p className="mt-1 text-sm text-slate-500">
          Your recent updates and alerts.
        </p>
      </div>

      <NotificationsList notifications={notifications} />
    </div>
  );
}
