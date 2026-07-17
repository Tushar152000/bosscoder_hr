import 'server-only';
import { cache } from 'react';
import { adminDb, FieldValue } from '@/lib/firebase/admin';
import { HR } from '@/lib/firebase/collections';
import { decryptOptional, encryptOptional } from '@/lib/crypto/encrypt';
import type {
  OfferData,
  OfferLetter,
  OfferLetterStored,
  OfferStatus,
} from '@/types/offer';

const COL = HR.offerLetters;

function tsToDate(ts: FirebaseFirestore.Timestamp | null | undefined): Date | null {
  return ts && typeof ts.toDate === 'function' ? ts.toDate() : null;
}

/** Encrypt a number by storing its decimal string. Decrypt → number on read. */
function decryptNumber(field: OfferLetterStored['annualBaseCtc']): number {
  const raw = decryptOptional(field);
  if (!raw) return 0;
  const n = Number(raw);
  return Number.isFinite(n) ? n : 0;
}

function toOffer(stored: OfferLetterStored): OfferLetter {
  return {
    offerId: stored.offerId,
    candidateName: stored.candidateName,
    candidateEmail: decryptOptional(stored.candidateEmail) ?? '',
    candidatePhone: decryptOptional(stored.candidatePhone) ?? '',
    employmentType: stored.employmentType,
    department: stored.department,
    templateKey: stored.templateKey,
    designation: stored.designation,
    offerDate: stored.offerDate,
    joiningDate: stored.joiningDate,
    annualBaseCtc: decryptNumber(stored.annualBaseCtc),
    annualVariableCtc: decryptNumber(stored.annualVariableCtc),
    variableRateText: stored.variableRateText ?? '',
    includePf: !!stored.includePf,
    pfAmountMonthly:
      typeof (stored as { pfAmountMonthly?: number }).pfAmountMonthly === 'number'
        ? (stored as { pfAmountMonthly: number }).pfAmountMonthly
        : 1800,
    includeBstIncentives: !!stored.includeBstIncentives,
    probationMonths: stored.probationMonths ?? 2,
    internshipDurationMonths: stored.internshipDurationMonths ?? 6,
    pocName: stored.pocName,
    pocDesignation: stored.pocDesignation,
    pocEmail: stored.pocEmail ?? '',
    bodyMarkdown: decryptOptional(stored.bodyMarkdown) ?? '',
    status: stored.status,
    createdBy: stored.createdBy,
    createdByEmail: stored.createdByEmail,
    createdAt: tsToDate(stored.createdAt as FirebaseFirestore.Timestamp),
    updatedAt: tsToDate(stored.updatedAt as FirebaseFirestore.Timestamp),
    finalizedAt: tsToDate(stored.finalizedAt),
  };
}

function dataToStored(
  data: OfferData,
  meta: { offerId: string; createdBy: string; createdByEmail: string; isCreate: boolean }
): Partial<OfferLetterStored> {
  return {
    offerId: meta.offerId,
    candidateName: data.candidateName.trim(),
    candidateEmail: encryptOptional(data.candidateEmail.trim()),
    candidatePhone: encryptOptional(data.candidatePhone.trim()),
    employmentType: data.employmentType,
    department: data.department,
    templateKey: data.templateKey,
    designation: data.designation.trim(),
    offerDate: data.offerDate,
    joiningDate: data.joiningDate,
    annualBaseCtc: encryptOptional(String(data.annualBaseCtc || 0)),
    annualVariableCtc: encryptOptional(String(data.annualVariableCtc || 0)),
    variableRateText: data.variableRateText.trim(),
    includePf: data.includePf,
    pfAmountMonthly: Number.isFinite(data.pfAmountMonthly) ? data.pfAmountMonthly : 1800,
    includeBstIncentives: data.includeBstIncentives,
    probationMonths: data.probationMonths,
    internshipDurationMonths: data.internshipDurationMonths,
    pocName: data.pocName,
    pocDesignation: data.pocDesignation,
    pocEmail: data.pocEmail.trim(),
    bodyMarkdown: encryptOptional(data.bodyMarkdown),
    updatedAt: FieldValue.serverTimestamp(),
    ...(meta.isCreate
      ? {
          status: 'draft' as OfferStatus,
          createdBy: meta.createdBy,
          createdByEmail: meta.createdByEmail,
          createdAt: FieldValue.serverTimestamp(),
          finalizedAt: null,
        }
      : {}),
  };
}

export interface OfferListItem {
  offerId: string;
  candidateName: string;
  employmentType: 'full-time' | 'internship';
  templateKey: OfferLetterStored['templateKey'];
  department: string;
  designation: string;
  offerDate: string;
  joiningDate: string;
  status: OfferStatus;
  createdByEmail: string;
  createdAt: Date | null;
  updatedAt: Date | null;
}

async function _listOfferLetters(): Promise<OfferListItem[]> {
  const snap = await adminDb
    .collection(COL)
    .orderBy('updatedAt', 'desc')
    .limit(200)
    .get();
  return snap.docs.map((d) => {
    const s = d.data() as OfferLetterStored;
    return {
      offerId: s.offerId,
      candidateName: s.candidateName,
      employmentType: s.employmentType,
      templateKey: s.templateKey,
      department: s.department,
      designation: s.designation,
      offerDate: s.offerDate,
      joiningDate: s.joiningDate,
      status: s.status,
      createdByEmail: s.createdByEmail,
      createdAt: tsToDate(s.createdAt as FirebaseFirestore.Timestamp),
      updatedAt: tsToDate(s.updatedAt as FirebaseFirestore.Timestamp),
    };
  });
}
export const listOfferLetters = cache(_listOfferLetters);

async function _getOfferLetter(offerId: string): Promise<OfferLetter | null> {
  const snap = await adminDb.collection(COL).doc(offerId).get();
  if (!snap.exists) return null;
  return toOffer(snap.data() as OfferLetterStored);
}
export const getOfferLetter = cache(_getOfferLetter);

export async function createOfferLetter(
  data: OfferData,
  actor: { uid: string; email: string }
): Promise<OfferLetter> {
  const ref = adminDb.collection(COL).doc();
  const offerId = ref.id;
  const doc = dataToStored(data, {
    offerId,
    createdBy: actor.uid,
    createdByEmail: actor.email,
    isCreate: true,
  });
  await ref.set(doc);
  const created = await getOfferLetter(offerId);
  if (!created) throw new Error('Created offer not found');
  return created;
}

export async function updateOfferLetter(
  offerId: string,
  data: OfferData,
  actor: { uid: string; email: string }
): Promise<OfferLetter> {
  const ref = adminDb.collection(COL).doc(offerId);
  const exists = await ref.get();
  if (!exists.exists) throw new Error('Offer not found');
  const doc = dataToStored(data, {
    offerId,
    createdBy: actor.uid,
    createdByEmail: actor.email,
    isCreate: false,
  });
  await ref.update(doc);
  const updated = await getOfferLetter(offerId);
  if (!updated) throw new Error('Updated offer not found');
  return updated;
}

export async function setOfferStatus(
  offerId: string,
  status: OfferStatus
): Promise<void> {
  const update: Record<string, unknown> = {
    status,
    updatedAt: FieldValue.serverTimestamp(),
  };
  if (status === 'finalized') update.finalizedAt = FieldValue.serverTimestamp();
  await adminDb.collection(COL).doc(offerId).update(update);
}

export async function deleteOfferLetter(offerId: string): Promise<void> {
  await adminDb.collection(COL).doc(offerId).delete();
}

export function emptyOfferData(): OfferData {
  const today = new Date().toISOString().slice(0, 10);
  return {
    candidateName: '',
    candidateEmail: '',
    candidatePhone: '',
    employmentType: 'full-time',
    department: '',
    templateKey: 'other-dept',
    designation: '',
    offerDate: today,
    joiningDate: today,
    annualBaseCtc: 0,
    annualVariableCtc: 0,
    variableRateText: '',
    includePf: false,
    pfAmountMonthly: 1800,
    includeBstIncentives: false,
    probationMonths: 2,
    internshipDurationMonths: 6,
    pocName: 'Shreya Gupta',
    pocDesignation: 'Human Resources Associate',
    pocEmail: 'shreya.gupta@bosscoderacademy.com',
    bodyMarkdown: '',
  };
}

export function offerToData(offer: OfferLetter): OfferData {
  return {
    candidateName: offer.candidateName,
    candidateEmail: offer.candidateEmail,
    candidatePhone: offer.candidatePhone,
    employmentType: offer.employmentType,
    department: offer.department,
    templateKey: offer.templateKey,
    designation: offer.designation,
    offerDate: offer.offerDate,
    joiningDate: offer.joiningDate,
    annualBaseCtc: offer.annualBaseCtc,
    annualVariableCtc: offer.annualVariableCtc,
    variableRateText: offer.variableRateText,
    includePf: offer.includePf,
    pfAmountMonthly: offer.pfAmountMonthly,
    includeBstIncentives: offer.includeBstIncentives,
    probationMonths: offer.probationMonths,
    internshipDurationMonths: offer.internshipDurationMonths,
    pocName: offer.pocName,
    pocDesignation: offer.pocDesignation,
    pocEmail: offer.pocEmail,
    bodyMarkdown: offer.bodyMarkdown,
  };
}
