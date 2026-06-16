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

const ROLE_COLORS: Record<string, string> = {
  founder: 'bg-purple-50 text-purple-700 border-purple-200',
  hr: 'bg-[#E6F1FB] text-[#0C447C] border-[#C3D9EF]',
  manager: 'bg-sky-50 text-sky-700 border-sky-200',
  employee: 'bg-slate-100 text-slate-600 border-slate-200',
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
  joiningDate,
  photoURL,
  userInitials,
  avatarBg,
  role,
  isFounder,
  reportingManager,
  upcomingBirthdays,
  notifications,
}: HomeSidebarProps) {
  const hasProfile = !!designation || !!department || !!joiningDate;
  const roleLabel = ROLE_LABELS[role] ?? role;
  const roleColor = ROLE_COLORS[role] ?? ROLE_COLORS.employee;
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <aside className="bg-white border-l border-slate-200 lg:sticky lg:top-16 lg:h-[calc(100vh-4rem)] lg:overflow-hidden lg:self-start flex flex-col">

      {/* ── Profile hero ── */}
      <div className="relative px-5 pt-6 pb-6 bg-gradient-to-b from-[#EEF5FF] via-[#F5F9FF] to-white border-b border-slate-200 overflow-hidden">
        {/* decorative blobs */}
        <div className="pointer-events-none absolute -top-6 -right-6 w-28 h-28 rounded-full bg-[#0C447C]/10 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-0 w-16 h-16 rounded-full bg-[#0C447C]/5 blur-2xl" />

        <div className="relative flex flex-col items-center text-center gap-3">
          {/* Avatar */}
          <div className="relative">
            {photoURL ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={photoURL}
                alt=""
                referrerPolicy="no-referrer"
                className="w-[68px] h-[68px] rounded-2xl object-cover ring-[3px] ring-white shadow-lg"
              />
            ) : (
              <div
                className="w-[68px] h-[68px] rounded-2xl flex items-center justify-center text-white text-[24px] font-bold ring-[3px] ring-white shadow-lg"
                style={{ background: avatarBg }}
              >
                {userInitials}
              </div>
            )}
            <span className="absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full bg-emerald-400 border-2 border-white shadow-sm" />
          </div>

          {/* Name */}
          <div className="w-full min-w-0 px-1">
            <p
              className="text-[15px] font-bold text-slate-900 leading-tight truncate"
              title={displayName}
            >
              {displayName}
            </p>

            {/* Designation — clamp to 2 lines max so it never crashes layout */}
            {designation && (
              <p
                className="text-[11.5px] text-slate-500 mt-0.5 leading-snug line-clamp-2"
                title={designation}
              >
                {designation}
              </p>
            )}

            {/* Role badge */}
            {role && (
              <span
                className={`inline-block mt-2 text-[10px] font-semibold tracking-wider uppercase px-2.5 py-0.5 rounded-full border ${roleColor}`}
              >
                {roleLabel}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="flex-1 flex flex-col px-4 py-4 gap-3 overflow-y-auto min-h-0">

        {/* ── Profile info card ── */}
        {hasProfile ? (
          <div className="rounded-[8px] border border-slate-200 bg-slate-50/70 overflow-hidden flex-shrink-0">
            <div className="grid divide-y divide-slate-100">
              {designation && (
                <InfoRow icon={<Briefcase className="w-3.5 h-3.5" />} label="Designation">
                  <span className="truncate" title={designation}>{designation}</span>
                </InfoRow>
              )}
              {!isFounder && department && (
                <InfoRow icon={<Building2 className="w-3.5 h-3.5" />} label="Department">
                  <span className="truncate" title={department}>{department}</span>
                </InfoRow>
              )}
              {!isFounder && reportingManager && (
                <InfoRow icon={<UserCircle2 className="w-3.5 h-3.5" />} label="Reports to">
                  <span
                    className="inline-flex items-center justify-center w-4 h-4 rounded-full text-white text-[8px] font-bold mr-1.5 shrink-0"
                    style={{
                      background: colorForName(
                        reportingManager.displayName ?? reportingManager.email,
                      ),
                    }}
                  >
                    {initials(reportingManager.displayName, reportingManager.email).slice(0, 1)}
                  </span>
                  <span className="truncate" title={reportingManager.displayName}>{reportingManager.displayName}</span>
                </InfoRow>
              )}
              {joiningDate && (
                <InfoRow icon={<CalendarDays className="w-3.5 h-3.5" />} label="Joined">
                  <span className="truncate">{formatDate(joiningDate)}</span>
                </InfoRow>
              )}
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-5 text-center flex-shrink-0">
            <p className="text-[12px] font-medium text-slate-500">Profile not linked</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Contact HR to link your account.</p>
          </div>
        )}

        {/* ── Upcoming Birthdays ── */}
        <div className="rounded-[8px] border border-slate-200 bg-white flex flex-col" style={{ height: '152px' }}>
          <div className="px-4 pt-2.5 pb-1.5 flex items-center gap-2 border-b border-slate-100 flex-shrink-0">
            <span className="text-sm leading-none">🎂</span>
            <p className="text-[10px] font-bold tracking-[1.2px] uppercase text-slate-400 flex-1">
              Upcoming Birthdays
            </p>
            {upcomingBirthdays.filter((b) => b.daysUntil === 0).length > 0 && (
              <span className="text-[9px] font-semibold bg-pink-50 text-pink-700 border border-pink-100 px-1.5 py-0.5 rounded-full">
                Today 🎉
              </span>
            )}
          </div>
          <div className="overflow-y-auto flex-1 min-h-0">
            <BirthdayPanel entries={upcomingBirthdays} />
          </div>
        </div>

        {/* ── Notifications ── */}
        <div className="rounded-xl border border-slate-100 bg-white flex flex-col" style={{ height: '188px' }}>
          <div className="px-4 pt-2.5 pb-1.5 flex items-center justify-between border-b border-slate-100 flex-shrink-0">
            <p className="text-[10px] font-bold tracking-[1.2px] uppercase text-slate-400">
              Notifications
            </p>
            {unreadCount > 0 && (
              <span className="text-[9px] font-semibold bg-[#E6F1FB] text-[#0C447C] px-1.5 py-0.5 rounded-full border border-[#C3D9EF]">
                {unreadCount} new
              </span>
            )}
          </div>
          <div className="overflow-y-auto flex-1 min-h-0 px-3 pb-2">
            <HomeNotifications notifications={notifications} />
          </div>
        </div>

        {/* ── Settings link ── */}
        <div className="mt-auto pt-1 pb-2">
          <Link
            href="/settings"
            className="flex items-center justify-between w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-[#F5F9FF] hover:border-[#C3D9EF] transition-all group"
          >
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-md bg-slate-100 flex items-center justify-center group-hover:bg-[#E6F1FB] transition-colors">
                <Settings className="h-3.5 w-3.5 text-slate-400 group-hover:text-[#0C447C] transition-colors" />
              </div>
              <span className="text-[12px] font-medium text-slate-600 group-hover:text-[#0C447C] transition-colors">
                Account settings
              </span>
            </div>
            <ChevronRight className="h-3.5 w-3.5 text-slate-300 group-hover:text-[#0C447C] group-hover:translate-x-0.5 transition-all" />
          </Link>
        </div>

      </div>
    </aside>
  );
}

function InfoRow({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2.5 px-3.5 py-2.5 min-w-0">
      <span className="text-slate-400 shrink-0">{icon}</span>
      <span className="text-[11px] text-slate-400 shrink-0 w-[68px]">{label}</span>
      <span className="text-[12px] font-medium text-slate-800 flex items-center min-w-0 flex-1 overflow-hidden">
        {children}
      </span>
    </div>
  );
}
