import { requireUser } from '@/lib/auth/guard';
import { isPrivileged } from '@/lib/auth/roles';
import { SettingsRail } from '@/components/settings/settings-rail';

export const metadata = { title: 'Settings' };

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const privileged = isPrivileged(user.roles);

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)]">
      <aside className="hidden md:block w-52 shrink-0 border-r border-slate-200 sticky top-14 h-[calc(100vh-3.5rem)] overflow-y-auto">
        <SettingsRail privileged={privileged} />
      </aside>
      <div className="flex-1 min-w-0 px-4 md:px-8 py-5 md:py-6">
        <div className="md:hidden mb-6 -mx-4">
          <SettingsRail privileged={privileged} mobile />
        </div>
        {children}
      </div>
    </div>
  );
}
