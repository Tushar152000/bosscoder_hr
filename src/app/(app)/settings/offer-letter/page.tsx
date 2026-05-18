import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth/guard';
import { isPrivileged } from '@/lib/auth/roles';
import { getOfferSettings } from '@/lib/firestore/hr-settings';
import { OfferLetterForm } from '@/components/settings/offer-letter-form';

export const metadata = { title: 'Offer letter · Settings' };

export default async function OfferLetterSettingsPage() {
  const user = await requireUser();
  if (!isPrivileged(user.roles)) redirect('/?error=forbidden');

  const settings = await getOfferSettings();

  return <OfferLetterForm initialBackgroundUrl={settings.backgroundUrl} />;
}
