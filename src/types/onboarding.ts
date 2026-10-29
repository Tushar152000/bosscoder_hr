import type { AddressFields, FamilyFields, PreviousEmploymentFields } from '@/types/employee';

/**
 * Where a joiner is with their onboarding form.
 *  sent → they have the link, nothing saved yet
 *  in_progress → saved at least one step
 *  submitted → waiting for HR to check
 *  changes_requested → HR sent it back with a note; the link works again
 *  verified → HR checked it; the link is closed
 */
export type OnboardingStatus = 'sent' | 'in_progress' | 'submitted' | 'changes_requested' | 'verified';

export const ONBOARDING_STATUS_LABELS: Record<OnboardingStatus, string> = {
  sent: 'Not started',
  in_progress: 'In progress',
  submitted: 'Submitted',
  changes_requested: 'Changes requested',
  verified: 'Verified',
};

/** Everything the onboarding form asks (plaintext — encrypted when written to the employee). */
export interface OnboardingAnswers {
  phone: string | null;
  personalEmail: string | null;
  /** YYYY-MM-DD */
  dob: string | null;
  family: FamilyFields;
  emergencyContact: { name: string | null; phone: string | null; relation: string | null };
  address: AddressFields;
  permanentSame: boolean;
  permanentAddress: AddressFields;
  pan: string | null;
  aadhaar: string | null;
  uan: string | null;
  /** No UAN yet (never had a PF account). */
  noUan: boolean;
  /** No previous employer — skips that section. */
  firstJob: boolean;
  previousEmployment: PreviousEmploymentFields;
}

/** The onboarding record as HR sees it (one per employee). */
export interface OnboardingSummary {
  employeeId: string;
  status: OnboardingStatus;
  sentTo: string;
  sentAt: string | null;
  expiresAt: string | null;
  lastSavedAt: string | null;
  submittedAt: string | null;
  verifiedAt: string | null;
  hrNote: string | null;
  noUan: boolean;
  firstJob: boolean;
  /** Full link to the form, for HR to copy. Null once verified. */
  link: string | null;
}
