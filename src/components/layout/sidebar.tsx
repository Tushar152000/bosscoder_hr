'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Users,
  ClipboardList,
  FileText,
  Shield,
  ScrollText,
  Settings,
  Megaphone,
  CalendarCheck,
} from 'lucide-react';
import type { Permission, Role } from '@/lib/auth/roles';
import { cn } from '@/lib/utils';
import { Brand } from '@/components/layout/brand';

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  requiredRole?: Role[];
  requiredPermission?: Permission;
  group?: 'main' | 'admin';
}

const NAV: NavItem[] = [
  { href: '/directory', label: 'Directory', icon: Users, group: 'main' },
  { href: '/attendance', label: 'Attendance', icon: CalendarCheck, group: 'main' },
  { href: '/performance', label: 'Performance', icon: ClipboardList, group: 'main' },
  {
    href: '/offers',
    label: 'Offer Letters',
    icon: FileText,
    requiredPermission: 'manage_offer_letters',
    group: 'main',
  },
  {
    href: '/communications',
    label: 'Communications',
    icon: Megaphone,
    requiredPermission: 'manage_employees',
    group: 'main',
  },
  {
    href: '/admin/roles',
    label: 'Roles',
    icon: Shield,
    requiredPermission: 'manage_roles',
    group: 'admin',
  },
  {
    href: '/admin/audit',
    label: 'Audit Log',
    icon: ScrollText,
    requiredPermission: 'view_audit_log',
    group: 'admin',
  },
  { href: '/settings', label: 'Settings', icon: Settings, group: 'admin' },
];

export function Sidebar({
  roles,
  permissions,
}: {
  roles: Role[];
  permissions: Permission[];
}) {
  const pathname = usePathname();

  const visible = NAV.filter((item) => {
    if (item.requiredRole && !item.requiredRole.some((r) => roles.includes(r))) return false;
    if (item.requiredPermission && !permissions.includes(item.requiredPermission)) return false;
    return true;
  });
  const main = visible.filter((i) => i.group !== 'admin');
  const admin = visible.filter((i) => i.group === 'admin');

  return (
    <aside className="hidden w-60 shrink-0 border-r border-default bg-card md:flex md:flex-col">
      <div className="px-5 py-5">
        <Link
          href="/directory"
          className="block rounded-md transition-opacity hover:opacity-80"
          aria-label="Bosscoder Workspace"
        >
          <Brand />
        </Link>
      </div>
      <nav className="flex-1 space-y-4 px-3">
        <NavGroup items={main} pathname={pathname} />
        {admin.length > 0 && (
          <div>
            <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted">
              Admin
            </p>
            <NavGroup items={admin} pathname={pathname} />
          </div>
        )}
      </nav>
      <div className="px-5 pb-5 pt-3 text-xs text-muted">v0.2.0</div>
    </aside>
  );
}

function NavGroup({ items, pathname }: { items: NavItem[]; pathname: string }) {
  return (
    <div className="space-y-1">
      {items.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(href + '/');
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
              active ? 'bg-[#0C447C]-50 text-[#0C447C]-700' : 'text-gray-700 hover:bg-gray-100'
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        );
      })}
    </div>
  );
}
