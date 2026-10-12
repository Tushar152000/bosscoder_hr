import { Users, TrendingUp, PieChart, Mail, FileText, Megaphone, CalendarCheck } from "lucide-react";
import { requireUser } from "@/lib/auth/guard";
import { isPrivileged } from "@/lib/auth/roles";
import {
  getEmployeeById,
  getEmployeeByUserUid,
  listEmployeesForBirthdays,
} from "@/lib/firestore/employees";
import { getHrUser } from "@/lib/firestore/users";
import { canAccessAttendance } from "@/lib/attendance/access";
import { getUpcomingBirthdays } from "@/lib/birthday";
import { initials } from "@/lib/utils";
import { colorForName } from "@/lib/directory/colors";
import { QuickCard } from "@/components/dashboard/quick-card";
import { QuickAccessGrid, type QuickAccessItem } from "@/components/dashboard/quick-access-grid";
import { FeedbackWidget } from "@/components/feedback/feedback-widget";
import { getQuickCardOrder } from "@/lib/firestore/hr-settings";
import { BirthdayBanner } from "@/components/home/birthday-banner";
import { DobMissingBanner } from "@/components/home/dob-missing-banner";
import { AttendanceLiveBanner } from "@/components/home/attendance-live-banner";
import { HomeHero } from "@/components/home/home-hero";
import { HomeSidebar } from "@/components/home/home-sidebar";

export const metadata = { title: "Home" };

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await requireUser();
  const { error } = await searchParams;

  const [me, hrUser, birthdayEmployees, cardOrder] = await Promise.all([
    getEmployeeByUserUid(user.uid),
    getHrUser(user.uid),
    listEmployeesForBirthdays(),
    getQuickCardOrder(),
  ]);

  const reportingManager = me?.managerId
    ? await getEmployeeById(me.managerId)
    : null;
  const upcomingBirthdays = getUpcomingBirthdays(birthdayEmployees);
  const todayBirthdays = upcomingBirthdays.filter((e) => e.daysUntil === 0);

  const isFounder = user.roles.includes("founder");
  const isHR = isPrivileged(user.roles);

  // Staged rollout — rollout departments + their reporting managers + HR/founder (see canAccessAttendance).
  const canSeeAttendance = await canAccessAttendance(user.roles, me ?? null);
  const canManageOffers = user.permissions.includes("manage_offer_letters");

  const photoURL = hrUser?.photoURL ?? user.photoURL;
  const displayName = me?.displayName ?? user.displayName ?? user.email;
  const userInitials = initials(user.displayName, user.email);
  const avatarBg = colorForName(displayName);
  const firstName = (user.displayName ?? user.email).split(/[\s@]/)[0];
  // Server runs in UTC (Cloud Run) — greet and date in India time.
  const now = new Date();
  const timeOfDay = greetingFor(now);
  const dateLabel = now.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });

  const defaultCards: QuickAccessItem[] = [
    {
      key: "directory",
      node: <QuickCard href="/directory" icon={Users} iconBg="#E6F1FB" iconColor="#0C447C"
        title="Employee directory" description="Browse teams and reporting lines" />,
    },
    {
      key: "performance",
      node: <QuickCard href="/performance" icon={TrendingUp} iconBg="#E1F5EE" iconColor="#0F6E56"
        title="Performance evaluation" description="Ratings, goals and self-evaluation" />,
    },
    {
      key: "esop",
      node: <QuickCard href="/esop" icon={PieChart} iconBg="#EEEDFE" iconColor="#534AB7"
        title="ESOPs" description="Vested grants and statements" />,
    },
    {
      key: "leave",
      node: canSeeAttendance ? (
        <QuickCard href="/attendance" icon={CalendarCheck} iconBg="#EBF3FE" iconColor="#1D4ED8"
          title="Leave" description="Apply for leave, track work-from-home and view your balance" />
      ) : (
        <QuickCard href="/" icon={CalendarCheck} iconBg="#EBF3FE" iconColor="#1D4ED8"
          title="Leave" description="Apply for leave, track work-from-home and view your balance — launching soon"
          comingSoon />
      ),
    },
    ...(isHR
      ? [{
          key: "communications",
          node: <QuickCard href="/communications" icon={Megaphone} iconBg="#FEF3E7" iconColor="#B45309"
            title="Communications" description="Send broadcast emails by department" />,
        }]
      : []),
    {
      key: "newsletter",
      node: <QuickCard href="/" icon={Mail} iconBg="#F1EFE8" iconColor="#5F5E5A"
        title="Bosscoder newsletter" description="Company updates and stories" comingSoon />,
    },
    ...(canManageOffers
      ? [{
          key: "letters",
          node: <QuickCard href="/offers" icon={FileText} iconBg="#FEF3E7" iconColor="#B45309"
            title="Employment letters" description="Generate offer, relieving & experience letters on the letterhead" />,
        }]
      : []),
  ];
  // Saved keys first in HR's order; anything not in it (new cards) keeps its default spot at the end.
  const rank = new Map(cardOrder.map((k, i) => [k, i]));
  const quickCards = [...defaultCards].sort((a, b) => {
    const ra = rank.get(a.key) ?? Number.MAX_SAFE_INTEGER;
    const rb = rank.get(b.key) ?? Number.MAX_SAFE_INTEGER;
    return ra - rb; // stable sort keeps unsaved cards in default order
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] items-start min-h-[calc(100vh-4rem)]">
    
      <div className="py-8 md:pr-10 pr-4  flex flex-col gap-7 min-w-0 md:px-10 px-6">
        {error === "forbidden" && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-700">
            You don&apos;t have permission to view that page.
          </div>
        )}

        <HomeHero firstName={firstName} timeOfDay={timeOfDay} dateLabel={dateLabel} />

        {me && <DobMissingBanner hasDob={!!me.dateOfBirth} />}

        {canSeeAttendance && <AttendanceLiveBanner />}

        <BirthdayBanner people={todayBirthdays} />

        <QuickAccessGrid items={quickCards} canEdit={isHR} />
        <FeedbackWidget firstName={firstName} />
      </div>

      <HomeSidebar
        displayName={displayName}
        designation={me?.designation}
        department={me?.department}
        employeeId={me?.employeeId}
        joiningDate={me?.joiningDate}
        photoURL={photoURL}
        userInitials={userInitials}
        avatarBg={avatarBg}
        role={user.roles[0] ?? ""}
        isHR={isHR}
        isFounder={isFounder}
        reportingManager={reportingManager}
        upcomingBirthdays={upcomingBirthdays}
      />
    </div>
  );
}

function greetingFor(date: Date): string {
  const h = Number(
    new Intl.DateTimeFormat("en-US", { hour: "numeric", hourCycle: "h23", timeZone: "Asia/Kolkata" }).format(date),
  );
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}
