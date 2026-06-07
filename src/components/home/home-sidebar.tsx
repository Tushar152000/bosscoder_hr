import Link from 'next/link';
import { Settings, ChevronRight } from 'lucide-react';
import { BirthdayPanel } from '@/components/home/birthday-panel';
import { HomeNotifications } from '@/components/dashboard/home-notifications';
import { initials } from '@/lib/utils';
import { colorForName } from '@/lib/directory/colors';
import { formatDate } from '@/lib/format';
import type { NavNotification } from '@/components/layout/top-navbar';
import type { EmployeePublic } from '@/types/employee';

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

  return (
    <aside className="bg-white border-l border-slate-200/70 lg:sticky lg:top-14 lg:h-[calc(100vh-3.5rem)] lg:overflow-y-auto flex flex-col">

      {/* Profile header */}
      <div className="relative overflow-hidden px-5 pt-6 pb-5 border-b border-slate-100">
        <div className="pointer-events-none absolute -top-6 -right-6 h-20 w-20 rounded-full bg-[#0C447C]/10 blur-xl" />

        <div className="relative flex items-center gap-3">
          <div className="relative shrink-0">
            {photoURL ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={photoURL}
                alt=""
                referrerPolicy="no-referrer"
                className="w-[46px] h-[46px] rounded-xl object-cover ring-2 ring-white shadow-sm"
              />
            ) : (
              <div
                className="w-[46px] h-[46px] rounded-xl flex items-center justify-center text-white text-[16px] font-bold ring-2 ring-white shadow-sm"
                style={{ background: avatarBg }}
              >
                {userInitials}
              </div>
            )}
            <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-400 border-2 border-white" />
          </div>

          <div className="min-w-0">
            <p className="text-[14px] font-semibold text-slate-900 truncate leading-tight">{displayName}</p>
            {designation && (
              <p className="text-[11px] text-slate-500 mt-0.5 truncate">{designation}</p>
            )}
            {role && (
              <span className="inline-block mt-1 text-[9px] font-semibold tracking-[1px] uppercase bg-[#EBF3FE] text-[#0C447C] px-2 py-0.5 rounded-full">
                {role}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-col flex-1 px-5 py-5 gap-5">

        {/* Profile details */}
        {hasProfile ? (
          <div className="bg-[#FAFAFA] border border-slate-200/60 rounded-xl divide-y divide-slate-100">
            {isHR && employeeId && <DetailRow label="Employee ID" value={employeeId} mono />}
            {designation && <DetailRow label="Designation" value={designation} />}
            {!isFounder && department && <DetailRow label="Department" value={department} />}
            {!isFounder && reportingManager && (
              <DetailRow
                label="Reports to"
                value={reportingManager.displayName}
                prefix={
                  <span
                    className="inline-flex items-center justify-center w-4 h-4 rounded-full text-white text-[8px] font-bold mr-1.5 shrink-0"
                    style={{ background: colorForName(reportingManager.displayName ?? reportingManager.email) }}
                  >
                    {initials(reportingManager.displayName, reportingManager.email).slice(0, 1)}
                  </span>
                }
              />
            )}
            {joiningDate && <DetailRow label="Joined" value={formatDate(joiningDate)} />}
          </div>
        ) : (
          <div className="bg-[#FAFAFA] border border-slate-200/60 rounded-xl p-4 text-center">
            <p className="text-[11px] text-slate-500 font-medium">Profile not linked</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Contact HR to link your account.</p>
          </div>
        )}

        {/* Birthdays */}
        <BirthdayPanel entries={upcomingBirthdays} />

        {/* Notifications */}
        <div>
          <p className="text-[10px] font-bold tracking-[1.4px] uppercase text-slate-400 mb-3">
            Notifications
          </p>
          <HomeNotifications notifications={notifications} />
        </div>

        {/* Settings */}
        <div className="mt-auto pt-4 border-t border-slate-100">
          <Link
            href="/settings"
            className="flex items-center justify-between text-[12px] text-slate-500 hover:text-slate-900 transition-colors group"
          >
            <div className="flex items-center gap-2">
              <Settings className="h-3.5 w-3.5 text-slate-400 group-hover:text-slate-600 transition-colors" />
              Account settings
            </div>
            <ChevronRight className="h-3.5 w-3.5 text-slate-300 group-hover:text-slate-500 group-hover:translate-x-0.5 transition-all" />
          </Link>
        </div>
      </div>
    </aside>
  );
}

function DetailRow({
  label,
  value,
  mono,
  prefix,
}: {
  label: string;
  value: string;
  mono?: boolean;
  prefix?: React.ReactNode;
}) {
  return (
    <div className="flex justify-between items-center py-2 px-3.5 gap-2">
      <span className="text-[11px] text-slate-400 shrink-0">{label}</span>
      <span className={`text-[11px] font-medium text-slate-800 text-right flex items-center ${mono ? 'font-mono text-[10px]' : ''}`}>
        {prefix}
        {value}
      </span>
    </div>
  );
}
