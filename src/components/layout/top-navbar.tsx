"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  ChevronDown,
  LogOut,
  Menu,
  Settings as SettingsIcon,
  Shield,
  ScrollText,
  User,
  X,
  Users,
  ClipboardList,
  FileText,
  Megaphone,
  Home,
} from "lucide-react";
import * as Popover from "@radix-ui/react-popover";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase/client";
import { BosscoderLogo } from "@/assets/images/BosscoderLogo";
import { initials, cn } from "@/lib/utils";
import type { Permission, Role } from "@/lib/auth/roles";
import { markNotificationsReadAction, clearAllNotificationsAction } from "@/app/(app)/notifications/actions";

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
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [localAllRead, setLocalAllRead] = useState(false);
  const [localCleared, setLocalCleared] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close mobile nav on route change
  useEffect(() => { setMobileNavOpen(false); }, [pathname]);

  // Lock body scroll when mobile nav is open
  useEffect(() => {
    document.body.style.overflow = mobileNavOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileNavOpen]);

  useEffect(() => { setLocalAllRead(false); setLocalCleared(false); }, [notifications]);

  const unread = localAllRead ? 0 : notifications.filter((n) => !n.read).length;

  function handleBellOpenChange(open: boolean) {
    if (open && unread > 0) {
      setLocalAllRead(true);
      markNotificationsReadAction().catch(() => {});
    }
  }

  function handleClearAll() {
    setLocalCleared(true);
    clearAllNotificationsAction().catch(() => {});
  }

  const canSeeRoles = user.permissions.includes("manage_roles");
  const canSeeAudit = user.permissions.includes("view_audit_log");
  const canManageOfferLetters = user.permissions.includes("manage_offer_letters");
  const canManageEmployees = user.permissions.includes("manage_employees");

  const name = user.displayName ?? user.email;
  const first = name.split(/[\s@]/)[0];
  const userInitials = initials(user.displayName, user.email);

  const mobileNavItems = [
    { href: "/", label: "Home", icon: Home },
    { href: "/directory", label: "Directory", icon: Users },
    { href: "/performance", label: "Performance", icon: ClipboardList },
    ...(canManageOfferLetters ? [{ href: "/offers", label: "Offer Letters", icon: FileText }] : []),
    ...(canManageEmployees ? [{ href: "/communications", label: "Communications", icon: Megaphone }] : []),
  ];

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
    <>
      <header className="sticky top-0 z-30 h-[56px] md:h-[64px] w-full bg-white flex items-center shadow-sm justify-between px-4 md:px-6">
        <div className="max-w-[1300px] mx-auto flex justify-between items-center w-full gap-3">

          {/* Left: hamburger (mobile) + logo */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              className="md:hidden flex items-center justify-center w-9 h-9 rounded-lg hover:bg-slate-100 active:bg-slate-200 transition touch-manipulation"
              aria-label="Open menu"
            >
              <Menu size={20} className="text-slate-700" />
            </button>

            <Link href="/" aria-label="Home">
              <BosscoderLogo width={120} height={25} />
            </Link>
          </div>

          {/* Right: bell + avatar */}
          <div className="flex items-center gap-2">
            <Popover.Root onOpenChange={handleBellOpenChange}>
              <Popover.Trigger asChild>
                <button
                  type="button"
                  className="relative w-9 h-9 rounded-full border border-slate-200/70 bg-white hover:bg-slate-50 flex items-center justify-center transition touch-manipulation"
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
                  className="z-50 w-[calc(100vw-32px)] sm:w-80 max-h-96 overflow-y-auto bg-white border border-slate-200 rounded-lg shadow-lg p-2 outline-none"
                >
                  <div className="flex items-center justify-between px-2 py-1.5">
                    <p className="text-[11px] font-medium tracking-[0.8px] text-slate-400">NOTIFICATIONS</p>
                    {notifications.length > 0 && !localCleared && (
                      <button
                        type="button"
                        onClick={handleClearAll}
                        className="text-[11px] text-slate-400 hover:text-red-500 transition-colors"
                      >
                        Clear all
                      </button>
                    )}
                  </div>
                  {notifications.length === 0 || localCleared ? (
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

            {/* User avatar + dropdown */}
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                className="flex items-center gap-2 rounded-full border border-slate-200/70 bg-white pl-1 pr-2 md:pr-2.5 py-1 hover:bg-slate-50 transition touch-manipulation"
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
                <div className="absolute right-0 top-full mt-2 w-64 origin-top-right rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl z-50">
                  <div className="border-b border-slate-100 px-3 py-2.5 mb-1">
                    <p className="truncate text-[13px] font-medium text-slate-900">{name}</p>
                    <p className="truncate text-[11px] text-slate-500">{user.email}</p>
                  </div>
                  <nav className="space-y-0.5">
                    <DropdownLink href="/settings" icon={User} label="View profile" />
                    <DropdownLink href="/settings" icon={SettingsIcon} label="Settings" />
                    {canSeeRoles && (
                      <DropdownLink href="/admin/roles" icon={Shield} label="Roles & Permissions" />
                    )}
                    {canSeeAudit && (
                      <DropdownLink href="/admin/audit" icon={ScrollText} label="Audit Log" />
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

      {/* ── Mobile nav drawer ──────────────────────────────────────── */}
      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity md:hidden",
          mobileNavOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none",
        )}
        onClick={() => setMobileNavOpen(false)}
        aria-hidden="true"
      />

      {/* Drawer */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-50 h-full w-72 bg-white shadow-2xl flex flex-col transition-transform duration-300 ease-in-out md:hidden",
          mobileNavOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <Link href="/" onClick={() => setMobileNavOpen(false)}>
            <BosscoderLogo width={110} height={23} />
          </Link>
          <button
            type="button"
            onClick={() => setMobileNavOpen(false)}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 transition touch-manipulation"
            aria-label="Close menu"
          >
            <X size={18} className="text-slate-600" />
          </button>
        </div>

        {/* Nav links */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {mobileNavItems.map(({ href, label, icon: Icon }) => {
            const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setMobileNavOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-4 py-3 text-[15px] font-medium transition touch-manipulation",
                  active
                    ? "bg-[#EBF3FE] text-[#0C447C]"
                    : "text-slate-700 hover:bg-slate-50 active:bg-slate-100",
                )}
              >
                <Icon size={18} className={active ? "text-[#0C447C]" : "text-slate-500"} />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Drawer footer — user info + sign out */}
        <div className="border-t border-slate-100 px-4 py-4">
          <div className="flex items-center gap-3 mb-3">
            {user.photoURL ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.photoURL}
                alt=""
                referrerPolicy="no-referrer"
                className="w-9 h-9 rounded-full object-cover shrink-0"
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-[#0C447C] flex items-center justify-center text-white text-[12px] font-medium shrink-0">
                {userInitials}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-slate-900 truncate">{name}</p>
              <p className="text-[11px] text-slate-500 truncate">{user.email}</p>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            disabled={busy}
            className="flex w-full items-center gap-2 rounded-xl px-4 py-2.5 text-[14px] text-red-600 hover:bg-red-50 active:bg-red-100 transition touch-manipulation"
          >
            <LogOut size={15} />
            {busy ? "Signing out…" : "Sign out"}
          </button>
        </div>
      </aside>
    </>
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
