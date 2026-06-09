import { requireUser } from '@/lib/auth/guard';
import {
  getEmployeeById,
  getEmployeeByUserUid,
} from '@/lib/firestore/employees';
import { listNotificationsForUser } from '@/lib/firestore/notifications';
import { getHrUser } from '@/lib/firestore/users';
import { TopNavbar } from '@/components/layout/top-navbar';
import { Sidebar } from '@/components/layout/sidebar';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const [me, notifications, hrUser] = await Promise.all([
    getEmployeeByUserUid(user.uid),
    listNotificationsForUser(user.uid),
    getHrUser(user.uid),
  ]);
  const manager = me?.managerId ? await getEmployeeById(me.managerId) : null;
  const photoURL = hrUser?.photoURL ?? user.photoURL;

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
        }}
        notifications={notifications}
      />
      <div className="flex flex-1 min-h-0">
        <Sidebar roles={user.roles} permissions={user.permissions} />
        <main className="flex-1 min-w-0 w-full max-w-[1300px] mx-auto md:mx-0 md:max-w-none">
          {children}
        </main>
      </div>
    </div>
  );
}
