import Link from 'next/link';
import {
  Settings,
  ChevronRight,
  Briefcase,
  Building2,
  CalendarDays,
  UserCircle2,
} from 'lucide-react';
import { BirthdayPanel } from '@/components/home/birthday-panel';
import { HomeNotifications } from '@/components/dashboard/home-notifications';
import { initials } from '@/lib/utils';
import { colorForName } from '@/lib/directory/colors';
import { formatDate } from '@/lib/format';
import type { NavNotification } from '@/components/layout/top-navbar';
import type { EmployeePublic } from '@/types/employee';

const ROLE_LABELS: Record<string, string> = {
  founder: 'Founder',
  hr: 'HR',
  manager: 'Manager',
  employee: 'Employee',
};

interface HomeSidebarProps {
  displayName: string;
  designation?: string;
  department?: string;
  employeeId?: string;
  joiningDate?: Date;
  photoURL?: string | null;
  userInitials: string;
  avatarBg: string;
  role: string;
  isHR: boolean;
  isFounder: boolean;
  reportingManager?: EmployeePublic | null;
  upcomingBirthdays: { id: string; name: string; department?: string; daysUntil: number }[];
  notifications: NavNotification[];
}

export function HomeSidebar({
  displayName,
  designation,
  department,
  employeeId,
  joiningDate,
  photoURL,
  userInitials,
  avatarBg,
  role,
  isHR,
  isFounder,
  reportingManager,
  upcomingBirthdays,
  notifications,
}: HomeSidebarProps) {
  const hasProfile = !!employeeId || !!designation;
  const roleLabel = ROLE_LABELS[role] ?? role;

  return (
    <aside className="bg-white border-l border-slate-200/70 lg:sticky lg:top-14 lg:h-[calc(100vh-3.5rem)] lg:overflow-y-auto flex flex-col">

      {/* ── Profile hero ── */}
      <div className="relative px-5 pt-7 pb-6 bg-gradient-to-b from-[#EEF5FF] to-white border-b border-slate-100 overflow-hidden">
        {/* decorative blobs */}
        <div className="pointer-events-none absolute -top-8 -right-8 w-32 h-32 rounded-full bg-[#0C447C]/10 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-0 w-20 h-20 rounded-full bg-[#0C447C]/5 blur-2xl" />

        <div className="relative flex flex-col items-center text-center gap-3">
          {/* Avatar */}
          <div className="relative">
            {photoURL ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={photoURL}
                alt=""
                referrerPolicy="no-referrer"
                className="w-[64px] h-[64px] rounded-2xl object-cover ring-4 ring-white shadow-lg"
              />
            ) : (
              <div
                className="w-[64px] h-[64px] rounded-2xl flex items-center justify-center text-white text-[22px] font-bold ring-4 ring-white shadow-lg"
                style={{ background: avatarBg }}
              >
                {userInitials}
              </div>
            )}
            <span className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-emerald-400 border-[2.5px] border-white shadow-sm" />
          </div>

          {/* Name + role */}
          <div>
            <p className="text-[15px] font-bold text-slate-900 leading-tight">{displayName}</p>
            {designation && (
              <p className="text-[12px] text-slate-500 mt-0.5">{designation}</p>
            )}
            {role && (
              <span className="inline-block mt-2 text-[10px] font-semibold tracking-wider uppercase bg-[#E6F1FB] text-[#0C447C] px-2.5 py-1 rounded-full border border-[#C3D9EF]">
                {roleLabel}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="flex flex-col flex-1 px-4 py-5 gap-5 min-h-0">

        {/* Profile detail card */}
        {hasProfile ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50/60 divide-y divide-slate-100 overflow-hidden">
            {designation && (
              <DetailRow
                icon={<Briefcase className="w-3.5 h-3.5" />}
                label="Designation"
                value={designation}
              />
            )}
            {!isFounder && department && (
              <DetailRow
                icon={<Building2 className="w-3.5 h-3.5" />}
                label="Department"
                value={department}
              />
            )}
            {!isFounder && reportingManager && (
              <DetailRow
                icon={<UserCircle2 className="w-3.5 h-3.5" />}
                label="Reports to"
                value={reportingManager.displayName}
                prefix={
                  <span
                    className="inline-flex items-center justify-center w-4 h-4 rounded-full text-white text-[8px] font-bold mr-1.5 shrink-0"
                    style={{
                      background: colorForName(
                        reportingManager.displayName ?? reportingManager.email,
                      ),
                    }}
                  >
                    {initials(
                      reportingManager.displayName,
                      reportingManager.email,
                    ).slice(0, 1)}
                  </span>
                }
              />
            )}
            {joiningDate && (
              <DetailRow
                icon={<CalendarDays className="w-3.5 h-3.5" />}
                label="Joined"
                value={formatDate(joiningDate)}
              />
            )}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-5 text-center">
            <p className="text-[12px] font-medium text-slate-500">Profile not linked</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Contact HR to link your account.</p>
          </div>
        )}

        {/* Birthdays */}
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="px-4 pt-3.5 pb-1 flex items-center gap-1.5">
            <span className="text-base leading-none">🎂</span>
            <p className="text-[10px] font-bold tracking-[1.4px] uppercase text-slate-400">
              Upcoming Birthdays
            </p>
          </div>
          <BirthdayPanel entries={upcomingBirthdays} />
        </div>

        {/* Notifications */}
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="px-4 pt-3.5 pb-2 flex items-center justify-between">
            <p className="text-[10px] font-bold tracking-[1.4px] uppercase text-slate-400">
              Notifications
            </p>
            {notifications.filter((n) => !n.read).length > 0 && (
              <span className="text-[9px] font-semibold bg-[#E6F1FB] text-[#0C447C] px-1.5 py-0.5 rounded-full border border-[#C3D9EF]">
                {notifications.filter((n) => !n.read).length} new
              </span>
            )}
          </div>
          <div className="px-3 pb-3">
            <HomeNotifications notifications={notifications} />
          </div>
        </div>

        {/* Footer settings link */}
        <div className="mt-auto pt-1">
          <Link
            href="/settings"
            className="flex items-center justify-between w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 transition-all group"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-md bg-slate-100 flex items-center justify-center group-hover:bg-[#E6F1FB] transition-colors">
                <Settings className="h-3.5 w-3.5 text-slate-400 group-hover:text-[#0C447C] transition-colors" />
              </div>
              <span className="text-[12px] font-medium text-slate-600 group-hover:text-slate-900 transition-colors">
                Account settings
              </span>
            </div>
            <ChevronRight className="h-3.5 w-3.5 text-slate-300 group-hover:text-slate-500 group-hover:translate-x-0.5 transition-all" />
          </Link>
        </div>

      </div>
    </aside>
  );
}

function DetailRow({
  icon,
  label,
  value,
  mono,
  prefix,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  mono?: boolean;
  prefix?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2.5 px-3.5 py-2.5">
      <span className="text-slate-400 shrink-0">{icon}</span>
      <span className="text-[11px] text-slate-400 shrink-0 w-[72px]">{label}</span>
      <span
        className={`text-[12px] font-medium text-slate-800 flex items-center min-w-0 flex-1 ${mono ? 'font-mono text-[11px]' : ''}`}
      >
        {prefix}
        <span className="truncate">{value}</span>
      </span>
    </div>
  );
}
