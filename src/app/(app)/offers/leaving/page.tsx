import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { requirePermission } from '@/lib/auth/guard';
import { listEmployees } from '@/lib/firestore/employees';
import { getOfferSettings } from '@/lib/firestore/hr-settings';
import { QuickLetterEditor, type QuickEmployee } from '@/components/offers/quick-letter-editor';

export const metadata = { title: 'Leaving letter' };

const LEAVING_TEMPLATE = `**{{offerDate}}**

**To Whomsoever It May Concern**

This is to certify that **{{candidateName}}** was employed with **Bosscoder Software Services Pvt. Ltd.** as **{{designation}}** in the {{department}} department.

{{candidateName}} has been relieved from their duties and responsibilities with effect from {{offerDate}}, and has no dues pending with the company.

During the tenure with us, {{candidateName}}'s conduct and performance were found to be satisfactory. We thank them for their contributions and wish them all the best in their future endeavours.

For **Bosscoder Software Services Pvt. Ltd.**

**Rajat Kumar Garg**

Authorised Signatory`;

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
    <div className="flex h-[calc(100vh-3.5rem)] flex-col print:h-auto">
      <div className="no-print flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3">
        <Link href="/offers" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800">
          <ArrowLeft className="h-4 w-4" />
          Back to letters
        </Link>
        <span className="text-sm font-semibold text-slate-700">Leaving letter</span>
      </div>
      <div className="flex-1 overflow-hidden">
        <QuickLetterEditor
          employees={people}
          backgroundUrl={settings.backgroundUrl}
          starterBody={LEAVING_TEMPLATE}
          filenamePrefix="bosscoder-relieving-letter"
        />
      </div>
    </div>
  );
}
