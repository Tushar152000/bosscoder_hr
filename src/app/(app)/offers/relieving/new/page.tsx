import { requirePermission } from '@/lib/auth/guard';
import { listEmployees } from '@/lib/firestore/employees';
import { getOfferSettings } from '@/lib/firestore/hr-settings';
import { defaultBodyFor } from '@/lib/offers/templates';
import { QuickLetterEditor, type QuickEmployee } from '@/components/offers/quick-letter-editor';

export const metadata = { title: 'Relieving letter' };

export default async function NewRelievingLetterPage() {
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
    joiningDate: e.joiningDate ? e.joiningDate.toISOString().slice(0, 10) : undefined,
  }));

  return (
    <div className="h-[calc(100vh-3.5rem)] print:h-auto">
      <QuickLetterEditor
        employees={people}
        backgroundUrl={settings.backgroundUrl}
        templateKey="relieving"
        starterBody={defaultBodyFor('relieving')}
        filenamePrefix="bosscoder-relieving-letter"
        title="Relieving letter"
        editBasePath="/offers/relieving"
        backHref="/offers"
        backLabel="Back to offer letters"
        dateFields={[
          { key: 'resignationDate', label: 'resignation date' },
          { key: 'relievingDate', label: 'relieving date' },
          { key: 'lastWorkingDate', label: 'last working date' },
        ]}
      />
    </div>
  );
}
