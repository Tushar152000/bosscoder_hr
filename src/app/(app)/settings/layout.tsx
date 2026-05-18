import { requireUser } from '@/lib/auth/guard';
import { isPrivileged } from '@/lib/auth/roles';
import { SettingsRail } from '@/components/settings/settings-rail';

export const metadata = { title: 'Settings' };

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)]">
      <aside className="w-52 shrink-0 border-r border-slate-200 sticky top-14 h-[calc(100vh-3.5rem)] overflow-y-auto">
        <SettingsRail privileged={isPrivileged(user.roles)} />
      </aside>
      <div className="flex-1 min-w-0 px-8 py-6">
        {children}
      </div>
    </div>
  );
}
