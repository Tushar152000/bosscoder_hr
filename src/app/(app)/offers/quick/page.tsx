import { requirePermission } from '@/lib/auth/guard';
import { listEmployees } from '@/lib/firestore/employees';
import { getOfferSettings } from '@/lib/firestore/hr-settings';
import { QuickLetterEditor, type QuickEmployee } from '@/components/offers/quick-letter-editor';

export const metadata = { title: 'Quick letter' };

export default async function QuickLetterPage() {
  await requirePermission('manage_offer_letters');
  const [settings, employees] = await Promise.all([
    getOfferSettings(),
    listEmployees({ status: 'active', limit: 500 }),
  ]);

  const people: QuickEmployee[] = employees.map((e) => ({
    employeeId: e.employeeId,
    displayName: e.displayName,
    department: e.department ?? '',
    designation: e.designation ?? '',
    email: e.email ?? '',
  }));

  return (
    <div className="h-[calc(100vh-3.5rem)] print:h-auto">
      <QuickLetterEditor
        employees={people}
        backgroundUrl={settings.backgroundUrl}
        title="Quick letter"
        backHref="/offers"
        backLabel="Back to offer letters"
      />
    </div>
  );
}
