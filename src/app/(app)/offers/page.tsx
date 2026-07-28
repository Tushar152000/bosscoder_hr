import Link from 'next/link';
import { Plus, FileText, LogOut } from 'lucide-react';
import { requirePermission } from '@/lib/auth/guard';
import { listOfferLetters } from '@/lib/firestore/offer-letters';
import { Button } from '@/components/ui/button';
import { OffersTable } from '@/components/offers/offers-table';

export const metadata = { title: 'Employment Letters' };

export default async function OffersListPage() {
  await requirePermission('manage_offer_letters');
  const offers = await listOfferLetters();

  return (
    <div className="offers-theme space-y-6 px-6 md:px-10 py-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Employment Letters</h1>
          <p className="mt-1 text-sm text-muted">
            {offers.length} {offers.length === 1 ? 'letter' : 'letters'}. Drafts are
            editable; finalized letters are locked & view-only.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild>
            <Link href="/offers/experience/new">
              <FileText className="h-4 w-4" />
              Experience letter
            </Link>
          </Button>
          <Button asChild>
            <Link href="/offers/relieving/new">
              <LogOut className="h-4 w-4" />
              Relieving letter
            </Link>
          </Button>
          <Button asChild>
            <Link href="/offers/new">
              <Plus className="h-4 w-4" />
              New offer letter
            </Link>
          </Button>
        </div>
      </div>

      <OffersTable offers={offers} />
    </div>
  );
}
