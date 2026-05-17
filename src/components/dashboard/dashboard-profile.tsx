import Link from 'next/link';
import { initials } from '@/lib/utils';
import { formatDate } from '@/lib/format';
import type { EmployeePublic } from '@/types/employee';

interface Props {
  displayName: string;
  photoURL: string | null;
  userInitials: string;
  isFounder: boolean;
  employee: EmployeePublic | null;
  reportingManager: Pick<EmployeePublic, 'displayName' | 'email'> | null;
}

export function DashboardProfile({
  displayName,
  photoURL,
  userInitials,
  isFounder,
  employee,
  reportingManager,
}: Props) {
  return (
    <aside className="bg-white border-l border-slate-200/70 px-6 py-8 lg:sticky lg:top-14 lg:h-[calc(100vh-3.5rem)] lg:overflow-y-auto">
      <p className="text-[11px] font-medium tracking-[1.2px] text-slate-400 mb-4">
        MY PROFILE
      </p>

      {/* Avatar + name */}
      <div className="flex flex-col items-center text-center">
        {photoURL ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photoURL}
            alt=""
            referrerPolicy="no-referrer"
            className="w-[76px] h-[76px] rounded-full object-cover"
          />
        ) : (
          <div className="w-[76px] h-[76px] rounded-full bg-[#0C447C] flex items-center justify-center text-white text-[24px] font-medium">
            {userInitials}
          </div>
        )}
        <p className="mt-3 text-[15px] font-medium text-slate-900">{displayName}</p>
        {employee?.designation && (
          <p className="mt-0.5 text-[12px] text-slate-500">{employee.designation}</p>
        )}
      </div>

  
      {employee && (
        <div className="mt-5 bg-[#FAFAF7] border border-slate-200/70 rounded-lg p-3.5 divide-y divide-slate-200/70">
          <DetailRow label="Employee ID" value={employee.employeeId} mono />
          <DetailRow label="Designation" value={employee.designation} />
          {!isFounder && employee.department && (
            <DetailRow label="Department" value={employee.department} />
          )}
          {!isFounder && reportingManager && (
            <DetailRow
              label="Reports to"
              value={reportingManager.displayName}
              prefix={
                <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-[#0C447C] text-white text-[8px] font-medium mr-1.5 shrink-0">
                  {initials(reportingManager.displayName, reportingManager.email).slice(0, 1)}
                </span>
              }
            />
          )}
          {employee.joiningDate && (
            <DetailRow label="Joined" value={formatDate(employee.joiningDate)} />
          )}
        </div>
      )}

      {/* Notifications */}
      <div className="mt-6">
        <p className="text-[11px] font-medium tracking-[1.2px] text-slate-400 mb-3">
          NOTIFICATIONS
        </p>
        <p className="text-[12px] text-slate-400 py-2">You&apos;re all caught up</p>
        <Link
          href="/"
          className="text-[11px] text-[#0C447C] underline underline-offset-2 mt-1 inline-block"
        >
          View all
        </Link>
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
    <div className="flex justify-between items-center py-1.5 gap-2">
      <span className="text-[11px] text-slate-500 shrink-0">{label}</span>
      <span
        className={`text-[11px] font-medium text-slate-900 text-right flex items-center ${mono ? 'font-mono' : ''}`}
      >
        {prefix}
        {value}
      </span>
    </div>
  );
}
