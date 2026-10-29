import Link from 'next/link';
import { redirect } from 'next/navigation';
import { UserPlus } from 'lucide-react';
import { requireUser } from '@/lib/auth/guard';
import { canEditEmployees, canViewCompensation, canViewPersonalDocuments } from '@/lib/auth/employee-access';
import { isPrivileged } from '@/lib/auth/roles';
import { getEmployeeFull } from '@/lib/firestore/employees';
import { listOnboarding } from '@/lib/firestore/onboarding';
import { getIdDocuments } from '@/lib/firestore/documents';
import { documentOwnerKey } from '@/lib/documents-config';
import { answersFromEmployee } from '@/lib/onboarding/answers';
import { ONBOARDING_STEPS, stepErrors } from '@/lib/onboarding/validate';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { OnboardingDashboard, type OnboardingRow } from '@/components/onboarding/onboarding-dashboard';

export const metadata = { title: 'Onboarding' };
export const dynamic = 'force-dynamic';

/**
 * HR's onboarding dashboard: new joiners who've been sent the onboarding form,
 * how much each has filled in (and what's missing), and where the form stands.
 * HR adds joiners from here; the form to an existing employee is sent from their profile.
 */
export default async function OnboardingPage() {
  const user = await requireUser();
  if (!canEditEmployees(user)) redirect('/');
  // Working out what's filled means reading the encrypted fields.
  const canSeeDetails = isPrivileged(user.roles) && (canViewCompensation(user) || canViewPersonalDocuments(user));

  const records = await listOnboarding();
  const now = Date.now();
  const rows = (
    await Promise.all(
      records.map(async (r): Promise<OnboardingRow | null> => {
        const emp = await getEmployeeFull(r.employeeId);
        if (!emp || !emp.active) return null;
        let percent: number | null = null;
        let missing: string[] = [];
        if (canSeeDetails) {
          const docs = await getIdDocuments(documentOwnerKey(emp));
          const answers = answersFromEmployee(emp, { noUan: r.noUan, firstJob: r.firstJob });
          const flags = { aadhaar: docs.some((d) => d.docType === 'aadhaar'), pan: docs.some((d) => d.docType === 'pan') };
          missing = ONBOARDING_STEPS.filter((s) => Object.keys(stepErrors(s.id, answers, flags)).length > 0).map((s) => s.label);
          percent = Math.round(((ONBOARDING_STEPS.length - missing.length) / ONBOARDING_STEPS.length) * 100);
        }
        const open = r.status === 'sent' || r.status === 'in_progress' || r.status === 'changes_requested';
        return {
          employeeId: emp.employeeId,
          name: emp.displayName,
          designation: emp.designation,
          department: emp.department,
          joiningDate: emp.joiningDate.toISOString(),
          sendTo: r.sentTo,
          status: r.status,
          percent,
          missing,
          link: r.link,
          expired: !!(open && r.expiresAt && Date.parse(r.expiresAt) < now),
          sentAt: r.sentAt,
          updatedAt: r.verifiedAt ?? r.submittedAt ?? r.lastSavedAt ?? r.sentAt,
        };
      }),
    )
  ).filter((x): x is OnboardingRow => x !== null);

  return (
    <div className="px-6 md:px-10 py-5 space-y-5">
      <Breadcrumbs items={[{ label: 'Directory', href: '/directory' }, { label: 'Onboarding' }]} />
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-semibold text-slate-950">Onboarding</h1>
          <p className="mt-1 max-w-3xl text-[13px] text-slate-800">
            Add new joiners here — they get a professional welcome email with their onboarding form, fill it in without signing in,
            and you follow their progress below. Their answers land straight on their profile.
          </p>
        </div>
        {isPrivileged(user.roles) && (
          <Link
            href="/directory/new?from=onboarding"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-[#0C447C] px-4 py-2 text-[13px] font-semibold text-white hover:bg-[#0a3a6a]"
          >
            <UserPlus className="h-4 w-4" /> Add new joiner
          </Link>
        )}
      </div>
      <OnboardingDashboard rows={rows} />
    </div>
  );
}
