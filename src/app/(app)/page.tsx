import {
  Users,
  TrendingUp,
  PieChart,
  Mail,
  FileText,
  ClipboardCheck,
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
  const displayName  = me?.displayName ?? user.displayName ?? user.email;

  return (
    <div className="relative overflow-hidden ">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] min-h-[calc(100vh-3.5rem)]">

        <div className="py-8 space-y-7 flex md:flex-row flex-col  w-full xl:justify-between">

          {forbidden && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
              You don&apos;t have permission to view that page.
            </div>
          )}

          <div className="flex flex-col">
          <header>
            <h1 className="text-[22px] font-medium text-slate-900">
              Good {timeOfDay}, {firstName} 👋
            </h1>
            <p className="text-[13px] text-slate-500 mt-1">{dateLabel}</p>
          </header>

          <section>
            <p className="text-[11px] font-medium tracking-[1.2px] text-slate-400 mb-3">
              QUICK ACCESS
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
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
                href={user.permissions.includes('manage_offer_letters') ? '/offers' : '/'}
                icon={FileText}
                iconBg="#FEF3E7"
                iconColor="#B45309"
                title="Offer letters"
                description="Generate and manage candidate offer letters"
                comingSoon={!user.permissions.includes('manage_offer_letters')}
              />
            </div>
          </section>
          </div>

  
        
        </div>

     
        <aside className="bg-white border-l border-slate-200/70 px-6 py-8  lg:sticky lg:top-14 lg:h-[calc(100vh-3.5rem)] lg:overflow-y-auto">
          <p className="text-[11px] font-medium tracking-[1.2px] text-slate-400 mb-4">
            MY PROFILE
          </p>
          <div className="flex flex-col items-center text-center">
            {user.photoURL ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.photoURL}
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
            {me?.designation && (
              <p className="mt-0.5 text-[12px] text-slate-500">{me.designation}</p>
            )}
          </div>

          {/* Details card */}
          {me ? (
            <div className="mt-5 bg-[#FAFAF7] border border-slate-200/70 rounded-lg p-3.5 divide-y divide-slate-200/70">
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
                    <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-[#0C447C] text-white text-[8px] font-medium mr-1.5 shrink-0">
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
            <div className="mt-5 bg-[#FAFAF7] border border-slate-200/70 rounded-lg p-3.5 text-center">
              <p className="text-[11px] text-slate-400">
                Employee profile not linked yet.
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Contact HR to link your account.
              </p>
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

      </div>
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
