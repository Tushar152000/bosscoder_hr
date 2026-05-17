import { requireUser } from '@/lib/auth/guard';
import { Card, CardBody } from '@/components/ui/card';
import { OfferSettingsForm } from '@/components/offers/offer-settings-form';
import { getOfferSettings } from '@/lib/firestore/hr-settings';

export const metadata = { title: 'Settings' };

export default async function SettingsPage() {
  const user = await requireUser();
  const canManageOffers = user.permissions.includes('manage_offer_letters');
  const offerSettings = canManageOffers ? await getOfferSettings() : null;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Settings</h1>

      <Card>
        <CardBody>
          <p className="text-sm font-medium">Account</p>
          <dl className="mt-3 grid grid-cols-3 gap-2 text-sm">
            <dt className="text-muted">Email</dt>
            <dd className="col-span-2">{user.email}</dd>
            <dt className="text-muted">Name</dt>
            <dd className="col-span-2">{user.displayName ?? '—'}</dd>
            <dt className="text-muted">Roles</dt>
            <dd className="col-span-2">{user.roles.join(', ') || '—'}</dd>
            <dt className="text-muted">Permissions</dt>
            <dd className="col-span-2 text-xs text-muted">
              {user.permissions.join(', ') || '—'}
            </dd>
          </dl>
        </CardBody>
      </Card>

      {canManageOffers && offerSettings && (
        <OfferSettingsForm initialBackgroundUrl={offerSettings.backgroundUrl} />
      )}
    </div>
  );
}
