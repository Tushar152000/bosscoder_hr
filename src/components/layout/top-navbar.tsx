"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bell,
  ChevronDown,
  LogOut,
  Settings as SettingsIcon,
  Shield,
  ScrollText,
  User,
} from "lucide-react";
import * as Popover from "@radix-ui/react-popover";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase/client";
import { BosscoderLogo } from "@/assets/images/BosscoderLogo";
import { initials, cn } from "@/lib/utils";
import type { Permission, Role } from "@/lib/auth/roles";
import { markNotificationsReadAction } from "@/app/(app)/notifications/actions";

export interface NavNotification {
  id: string;
  title: string;
  href?: string;
  createdAt: Date;
  read: boolean;
  tone: "info" | "success" | "warning";
}

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
  notifications?: NavNotification[];
}

const TONE_DOT: Record<NavNotification["tone"], string> = {
  info: "bg-blue-500",
  success: "bg-emerald-500",
  warning: "bg-red-500",
};

export function TopNavbar({ user, notifications = [] }: Props) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [localAllRead, setLocalAllRead] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Reset local read state whenever notifications prop refreshes (page navigation)
  useEffect(() => { setLocalAllRead(false); }, [notifications]);

  const unread = localAllRead ? 0 : notifications.filter((n) => !n.read).length;

  function handleBellOpenChange(open: boolean) {
    if (open && unread > 0) {
      setLocalAllRead(true);
      markNotificationsReadAction().catch(() => {});
    }
  }
  const canSeeRoles = user.permissions.includes("manage_roles");
  const canSeeAudit = user.permissions.includes("view_audit_log");

  const name = user.displayName ?? user.email;
  const first = name.split(/[\s@]/)[0];
  const userInitials = initials(user.displayName, user.email);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  async function handleSignOut() {
    setBusy(true);
    try {
      await Promise.allSettled([
        signOut(auth),
        fetch("/api/auth/logout", { method: "POST" }),
      ]);
      router.replace("/login");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <header className="sticky top-0 z-30 h-[64px] w-full bg-white flex items-center shadow-sm justify-between px-6">
      <div className="max-w-[1300px] mx-auto flex justify-between items-center w-full">

        <Link href="/" aria-label="Home">
          <BosscoderLogo width={130} height={27} />
        </Link>

        <div className="flex items-center gap-2">
      
          <Popover.Root onOpenChange={handleBellOpenChange}>
            <Popover.Trigger asChild>
              <button
                type="button"
                className="relative w-9 h-9 rounded-full border border-slate-200/70 bg-white hover:bg-slate-50 flex items-center justify-center transition"
                aria-label="Notifications"
              >
                <Bell size={17} className="text-slate-700" />
                {unread > 0 && (
                  <span className="absolute top-1.5 right-2.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white" />
                )}
              </button>
            </Popover.Trigger>
            <Popover.Portal>
              <Popover.Content
                align="end"
                sideOffset={8}
                className="z-50 w-80 max-h-96 overflow-y-auto bg-white border border-slate-200 rounded-lg shadow-lg p-2 outline-none"
              >
                <p className="px-2 py-1.5 text-[11px] font-medium tracking-[0.8px] text-slate-400">
                  NOTIFICATIONS
                </p>
                {notifications.length === 0 ? (
                  <p className="px-2 py-4 text-center text-[12px] text-slate-400">
                    You&apos;re all caught up
                  </p>
                ) : (
                  <ul className="space-y-0.5">
                    {notifications.map((n) => {
                      const isUnread = !localAllRead && !n.read;
                      const inner = (
                        <>
                          <span className={cn("mt-1.5 w-1.5 h-1.5 rounded-full shrink-0", TONE_DOT[n.tone])} />
                          <div className="min-w-0 flex-1">
                            <p className={cn("text-[12px] leading-snug", isUnread ? "font-semibold text-slate-900" : "font-medium text-slate-700")}>
                              {n.title}
                            </p>
                            <p className="text-[10px] text-slate-400 mt-0.5">{timeAgo(n.createdAt)}</p>
                          </div>
                          {isUnread && <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />}
                        </>
                      );
                      return n.href ? (
                        <li key={n.id}>
                          <Link href={n.href} className="flex items-start gap-2.5 px-2 py-2 rounded-md hover:bg-slate-50 transition-colors">
                            {inner}
                          </Link>
                        </li>
                      ) : (
                        <li key={n.id} className="flex items-start gap-2.5 px-2 py-2 rounded-md">
                          {inner}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </Popover.Content>
            </Popover.Portal>
          </Popover.Root>

          {/* User pill */}
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              className="flex items-center gap-2 rounded-full border border-slate-200/70 bg-white pl-1 pr-2.5 py-1 hover:bg-slate-50 transition"
            >
              {user.photoURL ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.photoURL}
                  alt=""
                  referrerPolicy="no-referrer"
                  className="w-7 h-7 rounded-full object-cover"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-[#0C447C] flex items-center justify-center text-white text-[11px] font-medium shrink-0">
                  {userInitials}
                </div>
              )}
              <span className="hidden sm:inline text-[13px] font-medium text-slate-900">
                {first}
              </span>
              <ChevronDown
                size={14}
                className={cn(
                  "hidden sm:block text-slate-500 transition-transform",
                  menuOpen && "rotate-180",
                )}
              />
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-full mt-2 w-64 origin-top-right rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl">
                <div className="border-b border-slate-100 px-3 py-2.5 mb-1">
                  <p className="truncate text-[13px] font-medium text-slate-900">
                    {name}
                  </p>
                  <p className="truncate text-[11px] text-slate-500">
                    {user.email}
                  </p>
                </div>
                <nav className="space-y-0.5">
                  <DropdownLink
                    href="/settings"
                    icon={User}
                    label="View profile"
                  />
                  <DropdownLink
                    href="/settings"
                    icon={SettingsIcon}
                    label="Settings"
                  />
                  {canSeeRoles && (
                    <DropdownLink
                      href="/admin/roles"
                      icon={Shield}
                      label="Roles & Permissions"
                    />
                  )}
                  {canSeeAudit && (
                    <DropdownLink
                      href="/admin/audit"
                      icon={ScrollText}
                      label="Audit Log"
                    />
                  )}
                </nav>
                <div className="border-t border-slate-100 mt-1 pt-1">
                  <button
                    onClick={handleSignOut}
                    disabled={busy}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-[13px] text-red-600 hover:bg-red-50 transition"
                  >
                    <LogOut size={14} />
                    {busy ? "Signing out…" : "Sign out"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

function DropdownLink({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2 rounded-lg px-3 py-2 text-[13px] text-slate-700 hover:bg-slate-50 transition"
    >
      <Icon size={14} className="text-slate-500" />
      {label}
    </Link>
  );
}

function timeAgo(date: Date): string {
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}
