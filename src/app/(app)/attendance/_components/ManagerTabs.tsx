"use client";

import { useState } from "react";
import { Calendar } from "lucide-react";
import { EmployeeView } from "./EmployeeView";
import { TeamView } from "./TeamView";
import type {
  AttendanceRecord,
  LeaveBalance,
  LeaveRequest,
} from "@/types/attendance";
import type { TeamMember } from "../actions";

interface Props {
  employeeId: string;
  employeeName: string;
  initialRecords: AttendanceRecord[];
  balance: LeaveBalance;
  initialLeaveRequests: LeaveRequest[];
  initialYear: number;
  initialMonth: number;
  today: string;
  teamMembers: TeamMember[];
  initialTeamRecords: AttendanceRecord[];
  initialPendingLeaves: LeaveRequest[];
  // header strings computed server-side
  greeting: string;
  firstName: string;
  fullDate: string;
  weekNum: number;
}

type Tab = "my" | "team";

export function ManagerTabs({
  employeeId,
  employeeName,
  initialRecords,
  balance,
  initialLeaveRequests,
  initialYear,
  initialMonth,
  today,
  teamMembers,
  initialTeamRecords,
  initialPendingLeaves,
  greeting,
  firstName,
  fullDate,
  weekNum,
}: Props) {
  const [tab, setTab] = useState<Tab>("my");

  const pendingCount = initialPendingLeaves.filter(
    (l) => l.status === "pending",
  ).length;

  return (
    <div>


      <div className="flex justify-between items-center py-6">
        <div>
          <h1 className="text-[20px] font-semibold text-zinc-900">
            {greeting}, {firstName}
          </h1>
          <div className="mt-1 flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-zinc-400" />
            <span className="text-[13px] text-zinc-500">{fullDate}</span>
            <span className="mx-0.5 text-zinc-300">·</span>
            <span className="text-[13px] text-zinc-500">Week {weekNum}</span>
          </div>
        </div>
        <div className="flex items-center rounded-lg border border-zinc-200 bg-zinc-100 p-0.5">
          <button
            onClick={() => setTab("my")}
            className={[
              "rounded-md px-3.5 py-1.5 text-[13px] transition",
              tab === "my"
                ? "bg-white font-medium text-zinc-900 shadow-sm"
                : "text-zinc-500 hover:text-zinc-700",
            ].join(" ")}
          >
            My attendance
          </button>
          <button
            onClick={() => setTab("team")}
            className={[
              "flex items-center gap-1.5 rounded-md px-3.5 py-1.5 text-[13px] transition",
              tab === "team"
                ? "bg-white font-medium text-zinc-900 shadow-sm"
                : "text-zinc-500 hover:text-zinc-700",
            ].join(" ")}
          >
            My team
            {pendingCount > 0 && (
              <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-amber-100 px-1 text-[10px] font-bold text-amber-700">
                {pendingCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {tab === "my" ? (
        <EmployeeView
          employeeId={employeeId}
          employeeName={employeeName}
          initialRecords={initialRecords}
          balance={balance}
          initialLeaveRequests={initialLeaveRequests}
          initialYear={initialYear}
          initialMonth={initialMonth}
          today={today}
        />
      ) : (
        <TeamView
          teamMembers={teamMembers}
          initialTeamRecords={initialTeamRecords}
          initialPendingLeaves={initialPendingLeaves}
          initialYear={initialYear}
          initialMonth={initialMonth}
          today={today}
        />
      )}
    </div>
  );
}
