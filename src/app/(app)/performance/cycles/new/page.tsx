import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ChevronRight, Home } from 'lucide-react';
import { requireUser } from '@/lib/auth/guard';
import { canManageCycles } from '@/lib/auth/review-access';
import { listEmployees } from '@/lib/firestore/employees';
import { NewCycleForm } from '@/components/performance/new-cycle-form';

export const metadata = { title: 'New cycle' };

export default async function NewCyclePage() {
  const user = await requireUser();
  if (!canManageCycles(user)) redirect('/performance');

  const now = new Date();
  const employees = await listEmployees({ status: 'active', limit: 500 });

  return (
    <div className="px-4 py-6">

      <nav className="mb-4 flex items-center gap-1.5 text-[14px] text-slate-400">
        <Link href="/" className="flex items-center gap-1 hover:text-slate-600 transition">
          <Home className="h-3 w-3" />
          Home
        </Link>
        <ChevronRight className="h-2.5 w-2.5" />
        <Link href="/performance" className="hover:text-slate-600 transition">
          Performance
        </Link>
        <ChevronRight className="h-2.5 w-2.5" />
        <span className="text-slate-600 font-semibold">New cycle</span>
      </nav>

      <div className="mb-6">
        <h1 className="text-[24px] font-medium text-slate-900">Open a new review cycle</h1>
        <p className="mt-1 text-[14px] text-slate-500">
          Cycles assign forms to every active employee and their manager. You can save as a draft and open it later.
        </p>
      </div>

      <NewCycleForm
        defaultYear={now.getUTCFullYear()}
        defaultQuarter={Math.ceil((now.getUTCMonth() + 1) / 3)}
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
