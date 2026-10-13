import { requireUser } from '@/lib/auth/guard';
import {
  getEmployeeById,
  getEmployeeByUserUid,
} from '@/lib/firestore/employees';
import { listNotificationsForUser } from '@/lib/firestore/notifications';
import { displayPhotoURL, getHrUser } from '@/lib/firestore/users';
import { TopNavbar } from '@/components/layout/top-navbar';
import { canViewFeedback } from '@/lib/feedback/access';
import { canManageHrFeedback } from '@/lib/hr-feedback/access';
import { countNewHrFeedback } from '@/lib/firestore/hr-feedback';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const isHr = canManageHrFeedback(user);
  const [me, notifications, hrUser, hrInboxNew] = await Promise.all([
    getEmployeeByUserUid(user.uid),
    listNotificationsForUser(user.uid),
    getHrUser(user.uid),
    // A count query is cheap; a failure just hides the badge.
    isHr ? countNewHrFeedback().catch(() => 0) : Promise.resolve(undefined),
  ]);
  const manager = me?.managerId ? await getEmployeeById(me.managerId) : null;
  const photoURL = displayPhotoURL(hrUser, user.photoURL);

  return (
    <div className="min-h-screen flex flex-col bg-[#FAFAF7]">
      <TopNavbar
        user={{
          email: user.email,
          displayName: user.displayName,
          photoURL: photoURL,
          roles: user.roles,
          permissions: user.permissions,
          designation: me?.designation ?? null,
          department: me?.department ?? null,
          managerName: manager?.displayName ?? null,
          employeeId: me?.employeeId ?? null,
          canViewFeedback: canViewFeedback(user),
          hrInboxNew,
        }}
        notifications={notifications}
      />
      <main className="w-full">
        {children}
      </main>
    </div>
  );
}
