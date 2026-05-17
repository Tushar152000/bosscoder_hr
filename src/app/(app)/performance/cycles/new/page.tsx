import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { requireUser } from '@/lib/auth/guard';
import { canManageCycles } from '@/lib/auth/review-access';
import { NewCycleForm } from '@/components/performance/new-cycle-form';

export const metadata = { title: 'New cycle' };

export default async function NewCyclePage() {
  const user = await requireUser();
  if (!canManageCycles(user)) redirect('/performance');

  const now = new Date();
  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <Link
          href="/performance"
          className="inline-flex items-center gap-1 text-sm text-muted hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to performance
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">New review cycle</h1>
        <p className="mt-1 text-sm text-muted">
          Pick monthly or quarterly. After creating the cycle, click{' '}
          <span className="font-medium">Open cycle</span> to assign forms to every active employee
          and their manager.
        </p>
      </div>
      <NewCycleForm
        defaultYear={now.getUTCFullYear()}
        defaultMonth={now.getUTCMonth() + 1}
        defaultQuarter={Math.ceil((now.getUTCMonth() + 1) / 3)}
      />
    </div>
  );
}
