import {
  Users,
  TrendingUp,
  PieChart,
  Mail,
  FileText,
  ClipboardCheck,
  CalendarCheck,
} from "lucide-react";
import { QuickCard } from "@/components/dashboard/quick-card";

interface Props {
  firstName: string;
  timeOfDay: string;
  dateLabel: string;
  forbidden: boolean;
  canViewDirectory: boolean;
  isPeopleManager: boolean;
  directReportsCount: number;
  hasOfferLetters: boolean;
}

export function DashboardMain({
  firstName,
  timeOfDay,
  dateLabel,
  forbidden,
  canViewDirectory,
  isPeopleManager,
  directReportsCount,
  hasOfferLetters,
}: Props) {
  return (
    <div className="lg:px-10 py-8 space-y-7 relative overflow-hidden">
      {forbidden && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          You don&apos;t have permission to view that page.
        </div>
      )}

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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 max-w-[700px]">
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
            href="/attendance"
            icon={CalendarCheck}
            iconBg="#EBF3FE"
            iconColor="#1D4ED8"
            title="Attendance"
            description="Mark attendance, track leaves and balance"
          />

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
          {hasOfferLetters && (
            <QuickCard
              href="/offers"
              icon={FileText}
              iconBg="#FEF3E7"
              iconColor="#B45309"
              title="Offer letters"
              description="Generate and manage candidate offer letters"
            />
          )}
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
              badge={`${directReportsCount} ${directReportsCount === 1 ? "report" : "reports"}`}
              badgeTone="info"
            />
          )}
        </div>
      </section>
    </div>
  );
}
