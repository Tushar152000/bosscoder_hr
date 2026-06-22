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
import { listNotificationsForUser } from "@/lib/firestore/notifications";
import { getUpcomingBirthdays } from "@/lib/birthday";
import { initials } from "@/lib/utils";
import { colorForName } from "@/lib/directory/colors";
import { QuickCard } from "@/components/dashboard/quick-card";
import { BirthdayBanner } from "@/components/home/birthday-banner";
import { DobMissingBanner } from "@/components/home/dob-missing-banner";
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

  const [me, hrUser, notifications, birthdayEmployees] = await Promise.all([
    getEmployeeByUserUid(user.uid),
    getHrUser(user.uid),
    listNotificationsForUser(user.uid),
    listEmployeesForBirthdays(),
  ]);

  const reportingManager = me?.managerId
    ? await getEmployeeById(me.managerId)
    : null;
  const upcomingBirthdays = getUpcomingBirthdays(birthdayEmployees);
  const todayBirthdays = upcomingBirthdays.filter((e) => e.daysUntil === 0);

  const isFounder = user.roles.includes("founder");
  const isHR = isPrivileged(user.roles);

  // Staged rollout: Technology dept + their reporting managers + HR/founder.
  const canSeeAttendance = await canAccessAttendance(user.roles, me ?? null);

  const photoURL = hrUser?.photoURL ?? user.photoURL;
  const displayName = me?.displayName ?? user.displayName ?? user.email;
  const userInitials = initials(user.displayName, user.email);
  const avatarBg = colorForName(displayName);
  const firstName = (user.displayName ?? user.email).split(/[\s@]/)[0];
  const timeOfDay = greetingFor(new Date());
  const dateLabel = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] items-start min-h-[calc(100vh-4rem)]">
    
      <div className="py-8 md:pr-10 pr-4  flex flex-col gap-7 min-w-0 md:px-10 px-6">
        {error === "forbidden" && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-700">
            You don&apos;t have permission to view that page.
          </div>
        )}

        <HomeHero
          firstName={firstName}
          timeOfDay={timeOfDay}
          dateLabel={dateLabel}
          photoURL={photoURL}
          userInitials={userInitials}
          avatarBg={avatarBg}
        />

        {me && <DobMissingBanner hasDob={!!me.dateOfBirth} />}

        <BirthdayBanner people={todayBirthdays} />

        <section>
          <p className="text-[11px] font-bold tracking-[1.4px] uppercase text-slate-400 mb-4">
            Quick access
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            <QuickCard
              href="/directory"
              icon={Users}
              iconBg="#E6F1FB"
              iconColor="#0C447C"
              title="Employee directory"
              description="Browse teams and reporting lines"
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
              href="/esop"
              icon={PieChart}
              iconBg="#EEEDFE"
              iconColor="#534AB7"
              title="ESOPs"
              description="Vested grants and statements"
            />
            {canSeeAttendance ? (
              <QuickCard
                href="/attendance"
                icon={CalendarCheck}
                iconBg="#EBF3FE"
                iconColor="#1D4ED8"
                title="Attendance & Leave"
                description="Track attendance, apply for leaves and view your balance"
              />
            ) : (
              <QuickCard
                href="/"
                icon={CalendarCheck}
                iconBg="#EBF3FE"
                iconColor="#1D4ED8"
                title="Attendance & Leave"
                description="Track attendance, apply for leaves and view your balance — launching soon"
                comingSoon
              />
            )}
            {isHR && (
              <QuickCard
                href="/communications"
                icon={Megaphone}
                iconBg="#FEF3E7"
                iconColor="#B45309"
                title="Communications"
                description="Send broadcast emails by department"
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
            {isHR && (
              <QuickCard
                href="/"
                icon={FileText}
                iconBg="#FEF3E7"
                iconColor="#B45309"
                title="Offer letters"
                description="Generate and manage offer letters"
                comingSoon
              />
            )}
          </div>
        </section>
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
        notifications={notifications}
      />
    </div>
  );
}

function greetingFor(date: Date): string {
  const h = date.getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}
