import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { requirePermission } from '@/lib/auth/guard';
import { OfferEditor } from '@/components/offers/offer-editor';
import { emptyOfferData } from '@/lib/firestore/offer-letters';
import { getOfferSettings } from '@/lib/firestore/hr-settings';
import { defaultBodyFor } from '@/lib/offers/templates';

export const metadata = { title: 'New offer letter' };

export default async function NewOfferPage() {
  await requirePermission('manage_offer_letters');
  const settings = await getOfferSettings();
  const initial = emptyOfferData();
  // Pre-fill body from the default template so the right pane isn't blank.
  initial.bodyMarkdown = defaultBodyFor(initial.templateKey);

  return (
    <div className="-mx-6 -my-8 flex h-[calc(100vh-4rem)] flex-col print:m-0 print:h-auto">
      <div className="no-print border-b border-default bg-card px-6 py-3">
        <Link
          href="/offers"
          className="inline-flex items-center gap-1 text-sm text-muted hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to offer letters
        </Link>
      </div>
      <div className="flex-1 overflow-hidden">
        <OfferEditor
          initial={initial}
          status="draft"
          backgroundUrl={settings.backgroundUrl}
          pocOptions={settings.pocOptions}
        />
      </div>
    </div>
  );
}
