"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell, ChevronDown, ClipboardList, FileText,
  Home, LogOut, Menu, Megaphone, ScrollText,
  Settings as SettingsIcon, Shield, User, Users, X,
} from "lucide-react";
import * as Popover from "@radix-ui/react-popover";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase/client";
import { BosscoderLogo } from "@/assets/images/BosscoderLogo";
import { initials, cn } from "@/lib/utils";
import type { Permission, Role } from "@/lib/auth/roles";
import {
  markNotificationsReadAction,
  clearAllNotificationsAction,
} from "@/app/(app)/notifications/actions";

// ─── Types ────────────────────────────────────────────────────────────────────

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
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Close drawer on navigation
  useEffect(() => { setMobileNavOpen(false); }, [pathname]);

  // Lock body scroll while drawer is open
  useEffect(() => {
    document.body.style.overflow = mobileNavOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileNavOpen]);

  const canManageOfferLetters = user.permissions.includes("manage_offer_letters");
  const canManageEmployees    = user.permissions.includes("manage_employees");

  const navItems = [
    { href: "/",             label: "Home",           icon: Home },
    { href: "/directory",    label: "Directory",      icon: Users },
    { href: "/performance",  label: "Performance",    icon: ClipboardList },
    ...(canManageOfferLetters ? [{ href: "/offers",         label: "Offer Letters",   icon: FileText  }] : []),
    ...(canManageEmployees    ? [{ href: "/communications", label: "Communications",  icon: Megaphone }] : []),
  ];

  async function handleSignOut() {
    await Promise.allSettled([
      signOut(auth),
      fetch("/api/auth/logout", { method: "POST" }),
    ]);
    router.replace("/login");
    router.refresh();
  }

  return (
    <>
      <header className="sticky top-0 z-30 h-14 md:h-16 w-full bg-white border-b border-slate-100 shadow-sm">
        <div className="h-full max-w-[1300px] mx-auto px-4 md:px-0 flex items-center justify-between gap-4">


          <Link href="/" aria-label="Home" className="shrink-0">
            <BosscoderLogo width={150} height={25} />
          </Link>

          <div className="flex items-center gap-2">
            <NotificationBell notifications={notifications} />
            <UserMenu user={user} onSignOut={handleSignOut} />

            <div className="md:hidden">
              <button
                type="button"
                onClick={() => setMobileNavOpen(true)}
                aria-label="Open menu"
                className="w-9 h-9 flex items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 active:bg-slate-200 transition touch-manipulation"
              >
                <Menu size={20} />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div
        aria-hidden="true"
        onClick={() => setMobileNavOpen(false)}
        className={cn(
          "fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity duration-300 md:hidden",
          mobileNavOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none",
        )}
      />

      <aside
        className={cn(
          "fixed right-0 top-0 z-50 h-full w-72 bg-white shadow-2xl flex flex-col transition-transform duration-300 ease-in-out md:hidden",
          mobileNavOpen ? "translate-x-0" : "translate-x-full",
        )}
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <Link href="/" onClick={() => setMobileNavOpen(false)}>
            <BosscoderLogo width={140} height={23} />
          </Link>
          <button
            type="button"
            onClick={() => setMobileNavOpen(false)}
            aria-label="Close menu"
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 transition touch-manipulation"
          >
            <X size={18} />
          </button>
        </div>

        {/* Nav links */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {navItems.map(({ href, label, icon: Icon }) => {
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
                <Icon size={18} className={active ? "text-[#0C447C]" : "text-slate-400"} />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Drawer footer */}
        <div className="border-t border-slate-100 px-4 py-4 space-y-3">
          <div className="flex items-center gap-3">
            <Avatar photoURL={user.photoURL} initials={initials(user.displayName, user.email)} size={9} />
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-slate-900 truncate">
                {user.displayName ?? user.email}
              </p>
              <p className="text-[11px] text-slate-500 truncate">{user.email}</p>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-2 rounded-xl px-4 py-2.5 text-[14px] text-red-600 hover:bg-red-50 active:bg-red-100 transition touch-manipulation"
          >
            <LogOut size={15} />
            Sign out
          </button>
        </div>
      </aside>
    </>
  );
}

function NotificationBell({ notifications }: { notifications: NavNotification[] }) {
  const [localAllRead, setLocalAllRead] = useState(false);
  const [localCleared, setLocalCleared] = useState(false);

  useEffect(() => { setLocalAllRead(false); setLocalCleared(false); }, [notifications]);

  const unread = localAllRead ? 0 : notifications.filter((n) => !n.read).length;

  function onOpenChange(open: boolean) {
    if (open && unread > 0) {
      setLocalAllRead(true);
      markNotificationsReadAction().catch(() => {});
    }
  }

  function handleClearAll() {
    setLocalCleared(true);
    clearAllNotificationsAction().catch(() => {});
  }

  const visible = !localCleared && notifications.length > 0;

  return (
    <Popover.Root onOpenChange={onOpenChange}>
      <Popover.Trigger asChild>
        <button
          type="button"
          aria-label="Notifications"
          className="relative w-9 h-9 rounded-full border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center transition touch-manipulation"
        >
          <Bell size={17} className="text-slate-600" />
          {unread > 0 && (
            <span className="absolute top-1.5 right-2 w-2 h-2 rounded-full bg-red-500 ring-2 ring-white" />
          )}
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={8}
          className="z-50 w-[calc(100vw-32px)] sm:w-80 max-h-96 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl p-2 outline-none"
        >
          <div className="flex items-center justify-between px-2 py-1.5 mb-1">
            <p className="text-[10px] font-semibold tracking-widest text-slate-400 uppercase">
              Notifications
            </p>
            {visible && (
              <button
                type="button"
                onClick={handleClearAll}
                className="text-[11px] text-slate-400 hover:text-red-500 transition"
              >
                Clear all
              </button>
            )}
          </div>

          {!visible ? (
            <p className="py-6 text-center text-[12px] text-slate-400">You&apos;re all caught up</p>
          ) : (
            <ul className="space-y-0.5">
              {notifications.map((n) => {
                const isUnread = !localAllRead && !n.read;
                const content = (
                  <>
                    <span className={cn("mt-1.5 w-1.5 h-1.5 rounded-full shrink-0", TONE_DOT[n.tone])} />
                    <div className="flex-1 min-w-0">
                      <p className={cn("text-[12px] leading-snug", isUnread ? "font-semibold text-slate-900" : "text-slate-700")}>
                        {n.title}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{timeAgo(n.createdAt)}</p>
                    </div>
                    {isUnread && <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />}
                  </>
                );
                return (
                  <li key={n.id}>
                    {n.href ? (
                      <Link href={n.href} className="flex items-start gap-2.5 px-2 py-2 rounded-lg hover:bg-slate-50 transition">
                        {content}
                      </Link>
                    ) : (
                      <div className="flex items-start gap-2.5 px-2 py-2 rounded-lg">
                        {content}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

function UserMenu({
  user,
  onSignOut,
}: {
  user: Props["user"];
  onSignOut: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const canSeeRoles = user.permissions.includes("manage_roles");
  const canSeeAudit = user.permissions.includes("view_audit_log");
  const name        = user.displayName ?? user.email;
  const first       = name.split(/[\s@]/)[0];
  const userInitials = initials(user.displayName, user.email);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function handleSignOut() {
    setBusy(true);
    onSignOut().finally(() => setBusy(false));
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white md:pl-1 md:pr-2 md:py-1 p-1 hover:bg-slate-50 transition touch-manipulation"
      >
        <Avatar photoURL={user.photoURL} initials={userInitials} size={7} />
        <span className="hidden sm:block text-[13px] font-medium text-slate-800">{first}</span>
        <ChevronDown size={13} className={cn("hidden sm:block text-slate-400 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-64 rounded-xl border border-slate-200 bg-white shadow-xl p-1.5 z-50">

          <div className="px-3 py-2.5 border-b border-slate-100 mb-1">
            <p className="text-[13px] font-semibold text-slate-900 truncate">{name}</p>
            <p className="text-[11px] text-slate-500 truncate">{user.email}</p>
          </div>

          <nav className="space-y-0.5">
            <MenuLink href="/settings"    icon={User}         label="View profile" />
            <MenuLink href="/settings"    icon={SettingsIcon} label="Settings" />
            {canSeeRoles && <MenuLink href="/admin/roles" icon={Shield}     label="Roles & permissions" />}
            {canSeeAudit && <MenuLink href="/admin/audit" icon={ScrollText} label="Audit log" />}
          </nav>

          <div className="border-t border-slate-100 mt-1 pt-1">
            <button
              onClick={handleSignOut}
              disabled={busy}
              className="w-full flex items-center gap-2 rounded-lg px-3 py-2 text-[13px] text-red-600 hover:bg-red-50 transition"
            >
              <LogOut size={14} />
              {busy ? "Signing out…" : "Sign out"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Avatar({
  photoURL,
  initials: userInitials,
  size,
}: {
  photoURL: string | null;
  initials: string;
  size: number;
}) {
  const dim = `w-${size} h-${size}`;
  return photoURL ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={photoURL}
      alt=""
      referrerPolicy="no-referrer"
      className={`${dim} rounded-full object-cover shrink-0`}
    />
  ) : (
    <div className={`${dim} rounded-full bg-[#0C447C] flex items-center justify-center text-white text-[11px] font-medium shrink-0`}>
      {userInitials}
    </div>
  );
}

function MenuLink({
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
      className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] text-slate-700 hover:bg-slate-50 transition"
    >
      <Icon size={14} className="text-slate-400" />
      {label}
    </Link>
  );
}

function timeAgo(date: Date): string {
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60)    return "just now";
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}
