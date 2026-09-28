'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { requireUser } from '@/lib/auth/guard';
import { writeAuditLog } from '@/lib/audit';
import {
  createOfferLetter,
  deleteOfferLetter,
  getOfferLetter,
  setOfferStatus,
  updateOfferLetter,
} from '@/lib/firestore/offer-letters';
import { updateOfferSettings } from '@/lib/firestore/hr-settings';
import { sendOfferLetterEmail } from '@/lib/email/offer-letter';
import { safeDisplayName } from '@/lib/offers/pdf-export';
import type { OfferData, OfferSettings } from '@/types/offer';

export type ActionResult<T = void> =
  | ({ ok: true } & (T extends void ? object : { data: T }))
  | { ok: false; error: string };

function canManageOffers(user: { permissions: string[] }) {
  return user.permissions.includes('manage_offer_letters');
}

const offerSchema = z.object({
  candidateName: z.string().min(1, 'Name required').max(120),
  candidateEmail: z.string().email().or(z.literal('')),
  candidatePhone: z.string().max(40),
  employmentType: z.enum(['full-time', 'internship']),
  department: z.string().max(80),
  templateKey: z.enum(['sales-ops', 'other-dept', 'intern', 'relieving', 'experience']),
  designation: z.string().min(1, 'Designation required').max(120),
  offerDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD'),
  joiningDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD'),
  annualBaseCtc: z.coerce.number().min(0, 'Cannot be negative').max(100_000_000),
  annualVariableCtc: z.coerce.number().min(0).max(100_000_000),
  variableRateText: z.string().max(120),
  includePf: z.boolean(),
  pfAmountMonthly: z.coerce.number().min(0).max(1_000_000),
  includeBstIncentives: z.boolean(),
  probationMonths: z.coerce.number().int().min(0).max(24),
  internshipDurationMonths: z.coerce.number().int().min(0).max(24),
  // Optional: offer letters always get a real POC from the picker, but
  // relieving/experience letters have no POC concept (always signed by
  // Rajat Garg directly) and legitimately leave these blank.
  pocName: z.string().max(80),
  pocDesignation: z.string().max(120),
  pocEmail: z.string().email().or(z.literal('')),
  bodyMarkdown: z.string().min(1, 'Letter body cannot be empty').max(40000),
});

export async function createOfferAction(
  data: OfferData
): Promise<ActionResult<{ offerId: string }>> {
  const user = await requireUser();
  if (!canManageOffers(user)) return { ok: false, error: 'Forbidden' };
  const parsed = offerSchema.safeParse(data);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' };
  }
  try {
    const offer = await createOfferLetter(parsed.data, {
      uid: user.uid,
      email: user.email,
    });
    await writeAuditLog({
      actorUid: user.uid,
      actorEmail: user.email,
      action: 'offer.create',
      resource: { type: 'offer_letter', id: offer.offerId },
      metadata: { candidate: offer.candidateName, type: offer.employmentType },
    });
    revalidatePath('/offers');
    return { ok: true, data: { offerId: offer.offerId } };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed to create' };
  }
}

export async function updateOfferAction(
  offerId: string,
  data: OfferData
): Promise<ActionResult> {
  const user = await requireUser();
  if (!canManageOffers(user)) return { ok: false, error: 'Forbidden' };
  const parsed = offerSchema.safeParse(data);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' };
  }
  try {
    await updateOfferLetter(offerId, parsed.data, { uid: user.uid, email: user.email });
    await writeAuditLog({
      actorUid: user.uid,
      actorEmail: user.email,
      action: 'offer.update',
      resource: { type: 'offer_letter', id: offerId },
    });
    revalidatePath('/offers');
    revalidatePath(`/offers/${offerId}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed to save' };
  }
}

export async function finalizeOfferAction(offerId: string): Promise<ActionResult> {
  const user = await requireUser();
  if (!canManageOffers(user)) return { ok: false, error: 'Forbidden' };
  const offer = await getOfferLetter(offerId);
  if (!offer) return { ok: false, error: 'Offer not found' };
  try {
    await setOfferStatus(offerId, 'finalized');
    await writeAuditLog({
      actorUid: user.uid,
      actorEmail: user.email,
      action: 'offer.finalize',
      resource: { type: 'offer_letter', id: offerId },
      metadata: { candidate: offer.candidateName },
    });
    revalidatePath('/offers');
    revalidatePath(`/offers/${offerId}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed to finalize' };
  }
}

export async function sendOfferEmailAction(
  offerId: string,
  pdfBase64: string
): Promise<ActionResult> {
  const user = await requireUser();
  if (!canManageOffers(user)) return { ok: false, error: 'Forbidden' };
  const offer = await getOfferLetter(offerId);
  if (!offer) return { ok: false, error: 'Offer not found' };
  if (offer.status !== 'finalized') {
    return { ok: false, error: 'Offer must be finalized before it can be emailed' };
  }
  if (!offer.candidateEmail) {
    return { ok: false, error: 'No candidate email on file for this offer' };
  }
  const letterKind =
    offer.templateKey === 'relieving'
      ? 'relieving'
      : offer.templateKey === 'experience'
      ? 'experience'
      : 'offer';
  const letterTypeLabel =
    letterKind === 'relieving'
      ? 'Relieving Letter'
      : letterKind === 'experience'
      ? 'Experience Letter'
      : offer.employmentType === 'internship'
      ? 'Internship Letter'
      : 'Offer Letter';
  try {
    const pdf = Buffer.from(pdfBase64, 'base64');
    const result = await sendOfferLetterEmail({
      candidateName: offer.candidateName,
      candidateEmail: offer.candidateEmail,
      designation: offer.designation,
      joiningDate: offer.joiningDate,
      pocName: offer.pocName,
      pocDesignation: offer.pocDesignation,
      pocEmail: offer.pocEmail,
      pdf,
      pdfFilename: `${safeDisplayName(offer.candidateName)} - ${letterTypeLabel}`,
      letterKind,
    });
    if (!result.ok) return { ok: false, error: result.error ?? 'Failed to send email' };
    await writeAuditLog({
      actorUid: user.uid,
      actorEmail: user.email,
      action: 'offer.send',
      resource: { type: 'offer_letter', id: offerId },
      metadata: { candidate: offer.candidateName, to: offer.candidateEmail },
    });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed to send email' };
  }
}

export async function deleteOfferAction(offerId: string): Promise<ActionResult> {
  const user = await requireUser();
  if (!canManageOffers(user)) return { ok: false, error: 'Forbidden' };
  const offer = await getOfferLetter(offerId);
  if (!offer) return { ok: false, error: 'Offer not found' };
  try {
    await deleteOfferLetter(offerId);
    await writeAuditLog({
      actorUid: user.uid,
      actorEmail: user.email,
      action: 'offer.update',
      resource: { type: 'offer_letter', id: offerId },
      metadata: { op: 'delete', candidate: offer.candidateName },
    });
    revalidatePath('/offers');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed to delete' };
  }
}

const settingsSchema = z.object({
  backgroundUrl: z.string().url().or(z.literal('')),
});

export async function updateOfferSettingsAction(
  partial: Partial<Pick<OfferSettings, 'backgroundUrl'>>
): Promise<ActionResult> {
  const user = await requireUser();
  if (!canManageOffers(user)) return { ok: false, error: 'Forbidden' };
  const parsed = settingsSchema.safeParse(partial);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid URL' };
  }
  try {
    await updateOfferSettings(parsed.data);
    await writeAuditLog({
      actorUid: user.uid,
      actorEmail: user.email,
      action: 'offer.update',
      resource: { type: 'hr_settings', id: 'offers' },
      metadata: { op: 'settings' },
    });
    revalidatePath('/offers');
    revalidatePath('/settings');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed to save' };
  }
}

export async function deleteOfferAndRedirect(offerId: string): Promise<void> {
  const res = await deleteOfferAction(offerId);
  if (res.ok) redirect('/offers');
}
