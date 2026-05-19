import {
  Users,
  TrendingUp,
  PieChart,
  Mail,
  FileText,
  ClipboardCheck,
  Bell,
  Settings,
} from 'lucide-react';
import Link from 'next/link';
import { requireUser } from '@/lib/auth/guard';
import {
  getEmployeeById,
  getEmployeeByUserUid,
  listEmployees,
} from '@/lib/firestore/employees';
import { QuickCard } from '@/components/dashboard/quick-card';
import { initials } from '@/lib/utils';
import { colorForName } from '@/lib/directory/colors';
import { formatDate } from '@/lib/format';

export const metadata = { title: 'Home' };

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const forbidden = params.error === 'forbidden';

  const me = await getEmployeeByUserUid(user.uid);
  const reportingManager =
    me?.managerId ? await getEmployeeById(me.managerId) : null;
  const directReports = me
    ? await listEmployees({ managerId: me.employeeId, status: 'any', limit: 200 })
    : [];
  const isPeopleManager = directReports.length > 0;

  const firstName = (user.displayName ?? user.email).split(/[\s@]/)[0];
  const timeOfDay = greetingFor(new Date());
  const today = new Date();
  const dateLabel = today.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const canViewDirectory = user.roles.some((r) =>
    (['founder', 'hr', 'manager'] as string[]).includes(r)
  );
  const isFounder = user.roles.includes('founder');

  const userInitials = initials(user.displayName, user.email);
  const displayName = me?.displayName ?? user.displayName ?? user.email;
  const avatarBg = colorForName(displayName);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] min-h-[calc(100vh-3.5rem)]">

      <div className="py-8 md:pr-10 pr-4 flex flex-col gap-8 min-w-0">

        {forbidden && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-700">
            You don&apos;t have permission to view that page.
          </div>
        )}

        <div>
          <h1 className="text-[22px] font-semibold text-slate-900 tracking-tight">
            Good {timeOfDay}, {firstName} 👋
          </h1>
          <p className="text-[13px] text-slate-400 mt-1">{dateLabel}</p>
        </div>

        {/* Quick access */}
        <section>
          <p className="text-[10px] font-semibold tracking-[1.4px] uppercase text-slate-400 mb-3">
            Quick access
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {canViewDirectory && (
              <QuickCard
                href="/directory"
                icon={Users}
                iconBg="#E6F1FB"
                iconColor="#0C447C"
                title="Employee directory"
                description="Browse teams and reporting lines"
                badge="Manager access"
                badgeTone="info"
              />
            )}

            <QuickCard
              href="/performance"
              icon={TrendingUp}
              iconBg="#E1F5EE"
              iconColor="#0F6E56"
              title="Performance evaluation"
              description="Ratings, goals and self-evaluation"
            />

            <QuickCard
              href="/"
              icon={PieChart}
              iconBg="#EEEDFE"
              iconColor="#534AB7"
              title="ESOPs"
              description="Vested grants and statements"
              comingSoon
            />

            <QuickCard
              href="/"
              icon={Mail}
              iconBg="#F1EFE8"
              iconColor="#5F5E5A"
              title="Bosscoder newsletter"
              description="Company updates and stories"
              comingSoon
            />

            {isPeopleManager && (
              <QuickCard
                href="/performance"
                icon={ClipboardCheck}
                iconBg="#E6F1FB"
                iconColor="#0C447C"
                title="Team evaluation"
                description="Review and rate your team's performance"
                badge={`${directReports.length} ${directReports.length === 1 ? 'report' : 'reports'}`}
                badgeTone="info"
              />
            )}

            <QuickCard
              href="/"
              icon={FileText}
              iconBg="#FEF3E7"
              iconColor="#B45309"
              title="Offer letters"
              description="Generate and manage candidate offer letters"
              comingSoon
            />
          </div>
        </section>
      </div>

      {/* ── Profile aside ── */}
      <aside className="bg-white border-l border-slate-200/70 px-6 py-8 lg:sticky lg:top-14 lg:h-[calc(100vh-3.5rem)] lg:overflow-y-auto flex flex-col">

        <p className="text-[10px] font-semibold tracking-[1.4px] uppercase text-slate-400 mb-5">
          My profile
        </p>

        {/* Avatar + name */}
        <div className="flex items-center gap-3 mb-5">
          <div className="relative shrink-0">
            {user.photoURL ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.photoURL}
                alt=""
                referrerPolicy="no-referrer"
                className="w-[52px] h-[52px] rounded-full object-cover ring-2 ring-white shadow-sm"
              />
            ) : (
              <div
                className="w-[52px] h-[52px] rounded-full flex items-center justify-center text-white text-[18px] font-semibold ring-2 ring-white shadow-sm"
                style={{ background: avatarBg }}
              >
                {userInitials}
              </div>
            )}
            <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-400 border-2 border-white" />
          </div>

          <div className="min-w-0">
            <p className="text-[14px] font-semibold text-slate-900 truncate">{displayName}</p>
            {me?.designation && (
              <p className="text-[11px] text-slate-500 mt-0.5 truncate">{me.designation}</p>
            )}
            {user.roles.length > 0 && (
              <p className="text-[10px] text-slate-400 mt-0.5 capitalize">
                {user.roles[0]}
              </p>
            )}
          </div>
        </div>

        {/* Profile detail card */}
        {me ? (
          <div className="bg-[#FAFAF7] border border-slate-200/70 rounded-xl p-3.5 divide-y divide-slate-200/50 mb-5">
            <DetailRow label="Employee ID" value={me.employeeId} mono />
            <DetailRow label="Designation" value={me.designation} />
            {!isFounder && me.department && (
              <DetailRow label="Department" value={me.department} />
            )}
            {!isFounder && reportingManager && (
              <DetailRow
                label="Reports to"
                value={reportingManager.displayName}
                prefix={
                  <span
                    className="inline-flex items-center justify-center w-4 h-4 rounded-full text-white text-[8px] font-semibold mr-1.5 shrink-0"
                    style={{ background: colorForName(reportingManager.displayName ?? reportingManager.email) }}
                  >
                    {initials(reportingManager.displayName, reportingManager.email).slice(0, 1)}
                  </span>
                }
              />
            )}
            {me.joiningDate && (
              <DetailRow label="Joined" value={formatDate(me.joiningDate)} />
            )}
          </div>
        ) : (
          <div className="bg-[#FAFAF7] border border-slate-200/70 rounded-xl p-4 text-center mb-5">
            <p className="text-[11px] text-slate-500 font-medium">Profile not linked</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Contact HR to link your account.</p>
          </div>
        )}

        {/* Notifications */}
        <div className="mb-5">
          <p className="text-[10px] font-semibold tracking-[1.4px] uppercase text-slate-400 mb-3">
            Notifications
          </p>
          <div className="flex flex-col items-center justify-center py-6 gap-2">
            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
              <Bell className="h-4 w-4 text-slate-400" />
            </div>
            <p className="text-[11px] text-slate-400">No new notifications</p>
          </div>
        </div>

        {/* Bottom settings link */}
        <div className="mt-auto pt-4 border-t border-slate-100">
          <Link
            href="/settings"
            className="flex items-center gap-2 text-[12px] text-slate-500 hover:text-slate-900 transition-colors group"
          >
            <Settings className="h-3.5 w-3.5 text-slate-400 group-hover:text-slate-600 transition-colors" />
            Account settings
          </Link>
        </div>
      </aside>

    </div>
  );
}

function greetingFor(date: Date): string {
  const h = date.getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
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
