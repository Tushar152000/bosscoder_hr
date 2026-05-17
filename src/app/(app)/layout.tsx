import { requireUser } from '@/lib/auth/guard';
import {
  getEmployeeById,
  getEmployeeByUserUid,
} from '@/lib/firestore/employees';
import { TopNavbar } from '@/components/layout/top-navbar';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const me = await getEmployeeByUserUid(user.uid);
  const manager = me?.managerId ? await getEmployeeById(me.managerId) : null;

  return (
    <div className="min-h-screen flex flex-col bg-[#FAFAF7]">
      <TopNavbar
        user={{
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          roles: user.roles,
          permissions: user.permissions,
          designation: me?.designation ?? null,
          department: me?.department ?? null,
          managerName: manager?.displayName ?? null,
        }}
        notifications={[]}
      />
      <main className="mx-auto w-full max-w-7xl flex-1 px-6">
        {children}
      </main>
    </div>
  );
}
