import { initials } from '@/lib/utils';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { EmployeePublic } from '@/types/employee';

interface Props {
  /** Display values — pass nulls if unknown. */
  name: string;
  email: string;
  photoURL: string | null;
  employee: EmployeePublic | null;
  /** Optional headline label below the name (e.g. designation · team). */
  reportingManagerName?: string | null;
  teamSize?: number | null;
}

const STATUS_PILLS: Record<
  EmployeePublic['status'],
  { label: string; className: string }
> = {
  active: {
    label: 'Active',
    className: 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30',
  },
  'on-notice': {
    label: 'On notice',
    className: 'bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/30',
  },
  left: {
    label: 'Left',
    className: 'bg-white/10 text-muted ring-1 ring-white/10',
  },
};

export function ProfileCard({
  name,
  email,
  photoURL,
  employee,
  reportingManagerName,
  teamSize,
}: Props) {
  const statusPill = employee ? STATUS_PILLS[employee.status] : null;

  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wider text-muted">
        My profile
      </p>

      <div className="mt-4 flex flex-col items-center text-center">
        {photoURL ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photoURL}
            alt=""
            referrerPolicy="no-referrer"
            className="h-20 w-20 rounded-full ring-1 ring-white/10"
          />
        ) : (
          <div className="grid h-20 w-20 place-items-center rounded-full bg-accent-500/20 text-xl font-semibold text-accent-200 ring-1 ring-accent-500/30">
            {initials(name, email)}
          </div>
        )}
        <h3 className="mt-3 text-base font-semibold text-white">
          {name || email.split('@')[0]}
        </h3>
        {employee ? (
          <p className="mt-0.5 text-xs text-muted">
            {employee.designation}
            {employee.department && <> · {employee.department}</>}
          </p>
        ) : (
          <p className="mt-0.5 text-xs text-muted">{email}</p>
        )}
        {statusPill && (
          <span
            className={cn(
              'mt-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium',
              statusPill.className
            )}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-current" />
            {statusPill.label}
          </span>
        )}
      </div>

      {employee && (
        <dl className="mt-5 space-y-3 border-t border-default pt-4 text-sm">
          <Row label="Employee ID" value={employee.employeeId.slice(0, 12)} />
          <Row label="Date of Joining" value={formatDate(employee.joiningDate)} />
          <Row
            label="Employment Type"
            value={
              employee.employmentType === 'full-time'
                ? 'Full-Time'
                : employee.employmentType === 'intern'
                ? 'Intern'
                : 'Contractor'
            }
          />
          {reportingManagerName && (
            <Row label="Reporting Manager" value={reportingManagerName} />
          )}
          {typeof teamSize === 'number' && teamSize > 0 && (
            <Row
              label="Team Size"
              value={`${teamSize} ${teamSize === 1 ? 'member' : 'members'}`}
            />
          )}
        </dl>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[10px] font-medium uppercase tracking-wider text-muted">
        {label}
      </dt>
      <dd className="mt-0.5 font-medium text-white">{value}</dd>
    </div>
  );
}
