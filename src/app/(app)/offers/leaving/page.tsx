import { requirePermission } from '@/lib/auth/guard';
import { listEmployees } from '@/lib/firestore/employees';
import { getOfferSettings } from '@/lib/firestore/hr-settings';
import { QuickLetterEditor, type QuickEmployee } from '@/components/offers/quick-letter-editor';

export const metadata = { title: 'Relieving letter' };

const LEAVING_TEMPLATE = `**{{offerDate}}**

## RELIEVING LETTER

Dear **{{candidateName}}**,

With reference to your resignation email dated **{{resignationDate}}**, you are hereby relieved from your duties as on **{{relievingDate}}**. We confirm that you have been working with **Bosscoder Software Services Pvt. Ltd.**, as **{{designation}}** from **{{joiningDate}}** to **{{lastWorkingDate}}**.

We would like to thank you for your service with Bosscoder Software Services Pvt. Ltd. & wish you the best wishes.

We wish you all the best in your future endeavors.

Yours Sincerely,

For **Bosscoder Academy**

**Rajat Garg**

Co-Founder`;

export default async function LeavingLetterPage() {
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
        starterBody={LEAVING_TEMPLATE}
        filenamePrefix="bosscoder-relieving-letter"
        title="Relieving letter"
        backHref="/offers"
        backLabel="Back to letters"
        dateFields={[
          { key: 'resignationDate', label: 'resignation date' },
          { key: 'relievingDate', label: 'relieving date' },
          { key: 'joiningDate', label: 'joining date' },
          { key: 'lastWorkingDate', label: 'last working date' },
        ]}
      />
    </div>
  );
}
