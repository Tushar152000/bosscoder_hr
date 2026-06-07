import { TrendingUp, Home, ChevronRight } from "lucide-react";
import Link from "next/link";
import { requireUser } from "@/lib/auth/guard";
import { isPrivileged } from "@/lib/auth/roles";
import {
  getEmployeeByUserUid,
  getAllEmployeesForTree,
} from "@/lib/firestore/employees";
import {
  listGrantsForEmployee,
  listEsopPlans,
  listAllGrants,
  deriveVestingSchedule,
} from "@/lib/firestore/esop";
import { formatINR, formatLakh } from "@/lib/esop/formatters";
import { HowItWorks } from "@/components/esop/how-it-works";
import { VestingTimeline } from "@/components/esop/vesting-timeline";
import { ShareBreakdown } from "@/components/esop/share-breakdown";
import { EsopClientPanel } from "@/components/esop/esop-client-panel";
import { EsopCalculatingModal } from "@/components/esop/esop-calculating-modal";
import type { EsopGrantWithPlan } from "@/types/esop";

export const metadata = { title: "ESOPs — Equity portal" };

export default async function EsopPage() {
  const user = await requireUser();
  const isAdmin = isPrivileged(user.roles);
  const isFounder = user.roles.includes('founder');

  const me = await getEmployeeByUserUid(user.uid);
  const rawGrants: EsopGrantWithPlan[] = me
    ? await listGrantsForEmployee(me.employeeId)
    : [];

  // Ensure every grant has a vestingSchedule (backfill if stored pre-schema)
  const myGrants = rawGrants.map((g) => ({
    ...g,
    vestingSchedule: deriveVestingSchedule(g),
  }));

  const totalGranted = myGrants.reduce((s, g) => s + g.sharesGranted, 0);
  const totalVested = myGrants.reduce((s, g) => s + g.sharesVested, 0);
  const totalUnvested = totalGranted - totalVested;
  const currentValue = myGrants.reduce(
    (s, g) => s + g.sharesVested * g.plan.perShareValue,
    0,
  );

  // Primary grant (most recent) for timeline/breakdown
  const primary = myGrants[0] ?? null;

  const [plans, allEmployees, allGrants] = isAdmin
    ? await Promise.all([
        listEsopPlans(),
        getAllEmployeesForTree(),
        listAllGrants(),
      ])
    : [[], [], []];

  const hasGrants = myGrants.length > 0;
  const role = isFounder ? 'founder' : isAdmin ? 'hr' : 'employee';

  return (
    <div className="mx-auto max-w-[1300px] py-8 space-y-6">
      <EsopCalculatingModal role={role} />
      <nav className="flex items-center gap-1.5 text-[14px] text-slate-400">
        <Link href="/" className="flex items-center hover:text-slate-600 transition-colors">
          <Home size={12} />
        </Link>
        <ChevronRight size={11} />
        <span className="text-slate-500 font-medium">ESOPs</span>
      </nav>
      {!isFounder && <div className="rounded-xl border border-[#bcd2ff] bg-[#EBF3FE] px-6 py-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <p className="text-[10px] font-semibold tracking-[1.4px] uppercase text-[#0C447C]">
            Employee stock ownership plan
          </p>
          <h1 className="text-[22px] font-bold text-[#0f172a] tracking-tight">
            Your equity in the company
          </h1>
          <p className="text-[13px] text-[#64748b] max-w-[480px]">
            As a valued team member, you have been granted options to own a
            share of Bosscoder. Options vest annually — the more you grow with
            us, the more you earn.
          </p>
        </div>
        {hasGrants && (
          <div className="flex flex-col gap-2 shrink-0">
            <div className="rounded-lg bg-[#0C447C] px-4 py-2.5 text-center">
              <p className="text-[10px] font-medium text-[#bcd2ff]">
                Vested value
              </p>
              <p className="text-[18px] font-bold text-white tabular-nums">
                {formatLakh(currentValue)}
              </p>
            </div>
            <div className="rounded-lg bg-[#E1F5EE] border border-[#A4DFC4] px-4 py-2 text-center">
              <p className="text-[11px] font-semibold text-[#27500A]">
                Active · {primary?.plan.type ?? "ESOP"}
              </p>
            </div>
          </div>
        )}
      </div>}

      {isAdmin && (
        <EsopClientPanel
          plans={plans}
          employees={allEmployees}
          allGrants={allGrants}
          isFounder={isFounder}
        />
      )}

      {hasGrants && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <MetricCard
            label="Granted shares"
            value={String(totalGranted)}
            sub="total options"
          />
          <MetricCard
            label="Vested shares"
            value={String(totalVested)}
            sub="exercisable"
            tone="green"
          />
          <MetricCard
            label="Unvested shares"
            value={String(totalUnvested)}
            sub="pending"
            tone="amber"
          />
          <MetricCard
            label="Per share value"
            value={formatINR(primary?.plan.perShareValue ?? 0)}
            sub={`as of ${primary?.plan.valuationYear ?? "—"}`}
            tone="blue"
          />
        </div>
      )}

      {!hasGrants && (
        <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-10 text-center space-y-2">
          <div className="w-10 h-10 rounded-xl bg-[#EBF3FE] flex items-center justify-center mx-auto">
            <TrendingUp size={18} color="#0C447C" />
          </div>
          <p className="text-[14px] font-semibold text-[#0f172a]">
            No grants assigned yet
          </p>
          <p className="text-[12px] text-[#64748b]">
            Your ESOP grants will appear here once assigned by HR.
          </p>
        </div>
      )}

      {/* ── How it works + Key terms ── */}

      {primary && (
        <VestingTimeline
          grantDate={primary.grantDate}
          vestingSchedule={primary.vestingSchedule}
          sharesGranted={primary.sharesGranted}
          perShareValue={primary.plan.perShareValue}
        />
      )}
      
      {primary && (
        <ShareBreakdown
          sharesGranted={primary.sharesGranted}
          sharesVested={primary.sharesVested}
          perShareValue={primary.plan.perShareValue}
          vestingSchedule={primary.vestingSchedule}
        />
      )}

      <HowItWorks />
    </div>
  );
}

function MetricCard({
  label,
  value,
  sub,
  tone = "default",
}: {
  label: string;
  value: string;
  sub: string;
  tone?: "default" | "green" | "amber" | "blue";
}) {
  const valueColor = {
    default: "text-[#0f172a]",
    green: "text-[#27500A]",
    amber: "text-[#854F0B]",
    blue: "text-[#0C447C]",
  }[tone];

  return (
    <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4 space-y-1">
      <p className="text-[10px] font-semibold uppercase tracking-[1px] text-[#64748b]">
        {label}
      </p>
      <p className={`text-[22px] font-bold tabular-nums ${valueColor}`}>
        {value}
      </p>
      <p className="text-[11px] text-[#64748b]">{sub}</p>
    </div>
  );
}
