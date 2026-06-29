import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { requirePermission } from '@/lib/auth/guard';
import { OfferEditor } from '@/components/offers/offer-editor';
import { getOfferLetter, offerToData } from '@/lib/firestore/offer-letters';
import { getOfferSettings } from '@/lib/firestore/hr-settings';
import { writeAuditLog } from '@/lib/audit';

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const o = await getOfferLetter(id);
  return {
    title: o ? `${o.candidateName} — Offer letter` : 'Offer letter',
  };
}

export default async function EditOfferPage({ params }: Props) {
  const user = await requirePermission('manage_offer_letters');
  const { id } = await params;
  const offer = await getOfferLetter(id);
  if (!offer) notFound();

  // Reading a stored offer decrypts CTC, candidate email, etc. — log it.
  await writeAuditLog({
    actorUid: user.uid,
    actorEmail: user.email,
    action: 'offer.read',
    resource: { type: 'offer_letter', id: offer.offerId },
    metadata: { candidate: offer.candidateName },
  });

  const settings = await getOfferSettings();

  return (
    <div className="offers-theme flex h-[calc(100vh-3.5rem)] flex-col bg-[#FAFAF7] print:h-auto">
      <div className="no-print border-b border-default bg-card px-6 py-3">
        <Link
          href="/offers"
          className="inline-flex items-center gap-1 text-sm text-muted hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to offer letters
        </Link>
      </div>
      <div className="flex-1 overflow-hidden">
        <OfferEditor
          offerId={offer.offerId}
          initial={offerToData(offer)}
          status={offer.status}
          backgroundUrl={settings.backgroundUrl}
          pocOptions={settings.pocOptions}
        />
      </div>
    </div>
  );
}
