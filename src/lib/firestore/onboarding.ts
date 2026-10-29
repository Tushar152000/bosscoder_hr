import 'server-only';
import { createHash, randomBytes } from 'node:crypto';
import { adminDb, FieldValue, Timestamp } from '@/lib/firebase/admin';
import { HR } from '@/lib/firebase/collections';
import { decryptOptional, encryptString, type EncryptedField } from '@/lib/crypto/encrypt';
import { appBaseUrl } from '@/lib/app-url';
import type { OnboardingStatus, OnboardingSummary } from '@/types/onboarding';

/**
 * One onboarding record per employee (doc id = employeeId). The joiner opens
 * /join/<token> — no sign-in — so the token is the key: only its hash is used for
 * lookups, and it's kept encrypted so HR can copy the link again.
 */

const COL = HR.onboarding;
/** How long a link works after it's sent. Re-sending gives a fresh link. */
const LINK_DAYS = 21;

interface OnboardingDoc {
  employeeId: string;
  tokenHash: string;
  token: EncryptedField;
  status: OnboardingStatus;
  sentTo: string;
  sentAt: FirebaseFirestore.Timestamp;
  sentBy: string;
  expiresAt: FirebaseFirestore.Timestamp;
  lastSavedAt?: FirebaseFirestore.Timestamp | null;
  submittedAt?: FirebaseFirestore.Timestamp | null;
  verifiedAt?: FirebaseFirestore.Timestamp | null;
  verifiedBy?: string | null;
  hrNote?: string | null;
  noUan?: boolean;
  firstJob?: boolean;
}

const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');
const iso = (ts: FirebaseFirestore.Timestamp | null | undefined) => ts?.toDate?.().toISOString() ?? null;

export function onboardingLink(token: string): string {
  return `${appBaseUrl()}/join/${token}`;
}

function toSummary(d: OnboardingDoc): OnboardingSummary {
  const token = d.status === 'verified' ? null : decryptOptional(d.token);
  return {
    employeeId: d.employeeId,
    status: d.status,
    sentTo: d.sentTo,
    sentAt: iso(d.sentAt),
    expiresAt: iso(d.expiresAt),
    lastSavedAt: iso(d.lastSavedAt),
    submittedAt: iso(d.submittedAt),
    verifiedAt: iso(d.verifiedAt),
    hrNote: d.hrNote ?? null,
    noUan: !!d.noUan,
    firstJob: !!d.firstJob,
    link: token ? onboardingLink(token) : null,
  };
}

/**
 * Start (or restart) onboarding for an employee with a fresh link. Any older
 * link stops working. Answers already saved on the employee stay.
 */
export async function issueOnboardingLink(args: {
  employeeId: string;
  sentTo: string;
  actorUid: string;
}): Promise<{ token: string; link: string }> {
  const token = randomBytes(24).toString('base64url');
  const ref = adminDb.collection(COL).doc(args.employeeId);
  const prev = await ref.get();
  const prevStatus = prev.exists ? (prev.data() as OnboardingDoc).status : null;
  await ref.set(
    {
      employeeId: args.employeeId,
      tokenHash: hashToken(token),
      token: encryptString(token),
      // A verified form being re-sent opens it again for edits.
      status: !prevStatus || prevStatus === 'verified' ? 'sent' : prevStatus,
      sentTo: args.sentTo,
      sentAt: FieldValue.serverTimestamp(),
      sentBy: args.actorUid,
      expiresAt: Timestamp.fromMillis(Date.now() + LINK_DAYS * 86_400_000),
      ...(prevStatus === 'verified' ? { verifiedAt: null, verifiedBy: null } : {}),
    },
    { merge: true },
  );
  return { token, link: onboardingLink(token) };
}

export async function getOnboarding(employeeId: string): Promise<OnboardingSummary | null> {
  const snap = await adminDb.collection(COL).doc(employeeId).get();
  return snap.exists ? toSummary(snap.data() as OnboardingDoc) : null;
}

export async function listOnboarding(): Promise<OnboardingSummary[]> {
  const snap = await adminDb.collection(COL).get();
  return snap.docs
    .map((d) => toSummary(d.data() as OnboardingDoc))
    .sort((a, b) => (b.sentAt ?? '').localeCompare(a.sentAt ?? ''));
}

/** The record a joiner's link points at, or why it can't be used. */
export async function findByToken(
  token: string,
): Promise<{ ok: true; record: OnboardingSummary } | { ok: false; reason: 'invalid' | 'expired' }> {
  if (!token || token.length > 100) return { ok: false, reason: 'invalid' };
  const snap = await adminDb.collection(COL).where('tokenHash', '==', hashToken(token)).limit(1).get();
  if (snap.empty) return { ok: false, reason: 'invalid' };
  const d = snap.docs[0]!.data() as OnboardingDoc;
  // Expiry only matters while the form is still open for the joiner.
  const open = d.status !== 'submitted' && d.status !== 'verified';
  if (open && d.expiresAt.toMillis() < Date.now()) return { ok: false, reason: 'expired' };
  return { ok: true, record: toSummary(d) };
}

/** The joiner saved a step. */
export async function markSaved(employeeId: string, flags: { noUan: boolean; firstJob: boolean }): Promise<void> {
  const ref = adminDb.collection(COL).doc(employeeId);
  const snap = await ref.get();
  const status = (snap.data() as OnboardingDoc | undefined)?.status;
  await ref.update({
    ...flags,
    lastSavedAt: FieldValue.serverTimestamp(),
    ...(status === 'sent' ? { status: 'in_progress' } : {}),
  });
}

export async function markSubmitted(employeeId: string, flags: { noUan: boolean; firstJob: boolean }): Promise<void> {
  await adminDb.collection(COL).doc(employeeId).update({
    ...flags,
    status: 'submitted',
    lastSavedAt: FieldValue.serverTimestamp(),
    submittedAt: FieldValue.serverTimestamp(),
  });
}

export async function markVerified(employeeId: string, actorUid: string): Promise<void> {
  await adminDb.collection(COL).doc(employeeId).update({
    status: 'verified',
    verifiedAt: FieldValue.serverTimestamp(),
    verifiedBy: actorUid,
    hrNote: null,
  });
}

/** Send the form back to the joiner with a note. The same link works again. */
export async function markChangesRequested(employeeId: string, note: string): Promise<void> {
  await adminDb.collection(COL).doc(employeeId).update({
    status: 'changes_requested',
    hrNote: note,
    // Give them time to fix it even if the original link was about to lapse.
    expiresAt: Timestamp.fromMillis(Date.now() + LINK_DAYS * 86_400_000),
  });
}

export async function deleteOnboarding(employeeId: string): Promise<void> {
  await adminDb.collection(COL).doc(employeeId).delete();
}
