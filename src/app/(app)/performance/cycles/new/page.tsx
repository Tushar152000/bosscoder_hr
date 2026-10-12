import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth/guard';
import { canManageCycles } from '@/lib/auth/review-access';
import { listEmployees } from '@/lib/firestore/employees';
import { NewCycleForm } from '@/components/performance/new-cycle-form';
import { Breadcrumbs } from '@/components/ui/breadcrumbs';
import { fyQuarterFor } from '@/lib/performance/cycle-period';

export const metadata = { title: 'New cycle' };

export default async function NewCyclePage() {
  const user = await requireUser();
  if (!canManageCycles(user)) redirect('/performance');

  const now = new Date();
  const employees = await listEmployees({ status: 'active', limit: 500 });

  return (
    <div className="px-6 md:px-10 py-6">

      <Breadcrumbs items={[{ label: 'Performance', href: '/performance' }, { label: 'New cycle' }]} className="mb-4" />

      <div className="mb-6">
        <h1 className="text-[24px] font-medium text-slate-900">Open a new review cycle</h1>
        <p className="mt-1 text-[14px] text-slate-500">
          Cycles assign forms to every active employee and their manager. You can save as a draft and open it later.
        </p>
      </div>

      <NewCycleForm
        defaultYear={fyQuarterFor(now).fyYear}
        defaultQuarter={fyQuarterFor(now).quarter}
        employees={employees.map((e) => ({
          employeeId: e.employeeId,
          displayName: e.displayName,
          email: e.email,
          department: e.department ?? '',
          designation: e.designation ?? '',
        }))}
      />
    </div>
  );
}
