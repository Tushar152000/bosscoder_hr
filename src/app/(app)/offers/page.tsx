import Link from 'next/link';
import { Plus, Lock, Unlock, FileText } from 'lucide-react';
import { requirePermission } from '@/lib/auth/guard';
import { listOfferLetters } from '@/lib/firestore/offer-letters';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardBody } from '@/components/ui/card';
import { formatDate } from '@/lib/format';

export const metadata = { title: 'Offer Letters' };

export default async function OffersListPage() {
  await requirePermission('manage_offer_letters');
  const offers = await listOfferLetters();

  return (
    <div className="offers-theme space-y-6 px-6 md:px-10 py-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Offer Letters</h1>
          <p className="mt-1 text-sm text-muted">
            {offers.length} {offers.length === 1 ? 'letter' : 'letters'}. Drafts are
            editable; finalized letters are locked & view-only.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="secondary">
            <Link href="/offers/quick">
              <FileText className="h-4 w-4" />
              Quick letter
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

      {offers.length === 0 ? (
        <Card>
          <CardBody className="text-sm text-muted">
            No offer letters yet.{' '}
            <Link href="/offers/new" className="text-[#0C447C] hover:underline">
              Create the first one →
            </Link>
          </CardBody>
        </Card>
      ) : (
        <div className="overflow-hidden rounded-lg border border-default bg-card">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3">Candidate</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Department</th>
                <th className="px-4 py-3">Joining</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Updated</th>
              </tr>
            </thead>
            <tbody>
              {offers.map((o) => (
                <tr key={o.offerId} className="border-t border-default hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <Link
                      href={`/offers/${o.offerId}`}
                      className="block font-medium text-slate-900 hover:underline"
                    >
                      {o.candidateName}
                    </Link>
                    <div className="text-xs text-muted">{o.designation}</div>
                  </td>
                  <td className="px-4 py-3 text-xs capitalize">
                    {o.employmentType.replace('-', ' ')}
                  </td>
                  <td className="px-4 py-3 text-xs">{o.department || '—'}</td>
                  <td className="px-4 py-3 text-xs">{formatDate(parseDate(o.joiningDate))}</td>
                  <td className="px-4 py-3">
                    {o.status === 'finalized' ? (
                      <Badge variant="success" className="gap-1">
                        <Lock className="h-3 w-3" /> Finalized
                      </Badge>
                    ) : o.status === 'archived' ? (
                      <Badge variant="muted">Archived</Badge>
                    ) : (
                      <Badge variant="warning" className="gap-1">
                        <Unlock className="h-3 w-3" /> Draft
                      </Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted">
                    {formatDate(o.updatedAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function parseDate(s: string): Date | null {
  if (!s) return null;
  const d = new Date(s + 'T00:00:00Z');
  return Number.isNaN(d.getTime()) ? null : d;
}
