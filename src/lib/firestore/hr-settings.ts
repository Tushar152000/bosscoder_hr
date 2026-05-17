import 'server-only';
import { cache } from 'react';
import { adminDb, FieldValue } from '@/lib/firebase/admin';
import { HR } from '@/lib/firebase/collections';
import { DEFAULT_OFFER_SETTINGS, type OfferSettings } from '@/types/offer';

const OFFER_DOC = 'offers';

async function _getOfferSettings(): Promise<OfferSettings> {
  const snap = await adminDb.collection(HR.settings).doc(OFFER_DOC).get();
  if (!snap.exists) return DEFAULT_OFFER_SETTINGS;
  const data = snap.data() as Partial<OfferSettings> & {
    // legacy fields, ignored on read but tolerated.
    letterheadUrl?: string;
    footerUrl?: string;
  };
  // Migrate older POC entries that lack an email field.
  const rawPocs = (data.pocOptions ?? []) as Array<{
    name: string;
    designation: string;
    email?: string;
  }>;
  const pocOptions =
    rawPocs.length > 0
      ? rawPocs.map((p) => ({
          name: p.name,
          designation: p.designation,
          email:
            p.email ??
            DEFAULT_OFFER_SETTINGS.pocOptions.find((d) => d.name === p.name)?.email ??
            '',
        }))
      : DEFAULT_OFFER_SETTINGS.pocOptions;
  return {
    backgroundUrl: data.backgroundUrl || DEFAULT_OFFER_SETTINGS.backgroundUrl,
    pocOptions,
    defaultDesignations: data.defaultDesignations ?? {},
  };
}
export const getOfferSettings = cache(_getOfferSettings);

export async function updateOfferSettings(
  partial: Partial<OfferSettings>
): Promise<OfferSettings> {
  const ref = adminDb.collection(HR.settings).doc(OFFER_DOC);
  const current = await getOfferSettings();
  const merged: OfferSettings = {
    ...current,
    ...partial,
  };
  await ref.set(
    {
      ...merged,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
  return merged;
}
