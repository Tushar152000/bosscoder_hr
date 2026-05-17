'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  ChevronDown,
  LogOut,
  Settings as SettingsIcon,
  Shield,
  ScrollText,
  Home,
} from 'lucide-react';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase/client';
import { Brand } from '@/components/layout/brand';
import { initials, cn } from '@/lib/utils';
import type { Permission, Role } from '@/lib/auth/roles';

interface Props {
  user: {
    email: string;
    displayName: string | null;
    photoURL: string | null;
    roles: Role[];
    permissions: Permission[];
    designation: string | null;
    department: string | null;
    managerName: string | null;
  };
}

/**
 * Slim top navigation. Replaces the old left sidebar — pages navigate via
 * the home dashboard's tiles, and admin/settings sit in the user dropdown.
 */
export function TopNav({ user }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const isHome = pathname === '/';
  const canSeeRoles = user.permissions.includes('manage_roles');
  const canSeeAudit = user.permissions.includes('view_audit_log');

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  async function handleSignOut() {
    setBusy(true);
    try {
      await Promise.allSettled([signOut(auth), fetch('/api/auth/logout', { method: 'POST' })]);
      router.replace('/login');
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <header className="sticky top-0 z-30 border-b border-default bg-[rgb(var(--bg-soft))]/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link
          href="/"
          className="flex items-center gap-2 rounded-md transition-opacity hover:opacity-90"
          aria-label="Home"
        >
          <Brand size={26} className="text-white" />
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {!isHome && (
            <Link
              href="/"
              className="flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium text-muted hover:bg-white/5 hover:text-white"
            >
              <Home className="h-4 w-4" />
              Home
            </Link>
          )}
        </nav>

        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="flex items-center gap-2 rounded-full p-1 pl-2 text-sm hover:bg-white/5"
          >
            <span className="hidden text-muted sm:inline">{firstName(user)}</span>
            {user.photoURL ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.photoURL}
                alt=""
                referrerPolicy="no-referrer"
                className="h-8 w-8 rounded-full ring-1 ring-white/10"
              />
            ) : (
              <div className="grid h-8 w-8 place-items-center rounded-full bg-accent-500/20 text-xs font-semibold text-accent-300 ring-1 ring-accent-500/40">
                {initials(user.displayName, user.email)}
              </div>
            )}
            <ChevronDown
              className={cn(
                'h-4 w-4 text-muted transition-transform',
                menuOpen && 'rotate-180'
              )}
            />
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-full mt-2 w-72 origin-top-right rounded-xl border border-default bg-card-elevated p-1.5 shadow-xl">
              <div className="border-b border-default px-3 py-2.5">
                <p className="truncate text-sm font-medium text-white">
                  {user.displayName ?? user.email}
                </p>
                <p className="truncate text-xs text-muted">{user.email}</p>
                {user.roles.length > 0 && (
                  <p className="mt-1 text-xs text-accent-300">
                    {user.roles.join(' · ')}
                  </p>
                )}
                <dl className="mt-2 space-y-1 text-xs">
                  <ProfileRow label="Designation" value={user.designation} />
                  <ProfileRow label="Department" value={user.department} />
                  <ProfileRow label="Reports to" value={user.managerName} />
                </dl>
              </div>
              <nav className="py-1">
                <MenuLink href="/settings" icon={SettingsIcon} label="Settings" />
                {canSeeRoles && (
                  <MenuLink href="/admin/roles" icon={Shield} label="Roles & Permissions" />
                )}
                {canSeeAudit && (
                  <MenuLink href="/admin/audit" icon={ScrollText} label="Audit Log" />
                )}
              </nav>
              <div className="border-t border-default pt-1">
                <button
                  onClick={handleSignOut}
                  disabled={busy}
                  className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-red-300 hover:bg-red-500/10"
                >
                  <LogOut className="h-4 w-4" />
                  {busy ? 'Signing out…' : 'Sign out'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

function MenuLink({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted hover:bg-white/5 hover:text-white"
    >
      <Icon className="h-4 w-4" />
      {label}
    </Link>
  );
}

function ProfileRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="shrink-0 text-muted">{label}</dt>
      <dd className="min-w-0 truncate text-right text-white">{value || '—'}</dd>
    </div>
  );
}

function firstName({
  displayName,
  email,
}: {
  displayName: string | null;
  email: string;
}): string {
  if (displayName) return displayName.split(/\s+/)[0];
  return email.split('@')[0];
}
