'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  User,
  Bell,
  Building2,
  FileText,
  BarChart2,
  ShieldCheck,
  ClipboardList,
  FolderOpen,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
}

const PERSONAL: NavItem[] = [
  { label: 'Account', href: '/settings/account', icon: User },
  { label: 'Notifications', href: '/settings/notifications', icon: Bell },
];

const ORG: NavItem[] = [
  { label: 'Company', href: '/settings/company', icon: Building2 },
  { label: 'Offer letter', href: '/settings/offer-letter', icon: FileText },
  { label: 'Evaluation defaults', href: '/settings/evaluation-defaults', icon: BarChart2 },
  { label: 'Roles & access', href: '/settings/roles', icon: ShieldCheck },
  { label: 'Audit log', href: '/settings/audit-log', icon: ClipboardList },
  { label: 'Employee Docs', href: '/settings/employee-documents', icon: FolderOpen },
];

interface Props {
  privileged: boolean;
  mobile?: boolean;
}

export function SettingsRail({ privileged, mobile = false }: Props) {
  const pathname = usePathname();

  if (mobile) {
    const renderGroup = (items: NavItem[]) =>
      items.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'relative flex shrink-0 flex-col items-center gap-1 px-4 py-2.5 text-[11px] font-medium transition-colors',
              active ? 'text-[#0C447C]' : 'text-slate-500 hover:text-slate-700',
            )}
          >
            <item.icon className={cn('h-[18px] w-[18px]', active ? 'text-[#0C447C]' : 'text-slate-400')} />
            <span className="whitespace-nowrap">{item.label}</span>
            {active && (
              <span className="absolute bottom-0 left-2 right-2 h-0.5 rounded-t-full bg-[#0C447C]" />
            )}
          </Link>
        );
      });

    return (
      <div className="relative">
        <div className="pointer-events-none absolute right-0 top-0 h-full w-8 bg-gradient-to-l from-white to-transparent z-10" />
        <nav className="flex overflow-x-auto scrollbar-none border-b border-slate-200">
          <div className="flex shrink-0">{renderGroup(PERSONAL)}</div>
          {privileged && (
            <>
              <div className="flex shrink-0 items-center px-1.5">
                <div className="h-5 w-px bg-slate-200" />
              </div>
              <div className="flex shrink-0">{renderGroup(ORG)}</div>
            </>
          )}
        </nav>
      </div>
    );
  }

  return (
    <nav className="flex flex-col gap-6 px-3 py-5">
      <NavGroup label="PERSONAL" items={PERSONAL} pathname={pathname} />
      {privileged && <NavGroup label="ORGANISATION" items={ORG} pathname={pathname} />}
    </nav>
  );
}

function NavGroup({
  label,
  items,
  pathname,
}: {
  label: string;
  items: NavItem[];
  pathname: string;
}) {
  return (
    <div>
      <p className="px-2 mb-1 text-[10px] font-semibold tracking-[1.1px] text-slate-400 uppercase">
        {label}
      </p>
      <ul className="flex flex-col gap-0.5">
        {items.map((item) => {
          const active = pathname === item.href;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  'flex items-center gap-2.5 px-2 py-2 rounded-md text-[13px] font-medium transition-colors',
                  active
                    ? 'bg-[#E6F1FB] text-[#0C447C]'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                )}
              >
                <item.icon
                  className={cn('h-4 w-4 shrink-0', active ? 'text-[#0C447C]' : 'text-slate-400')}
                />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
