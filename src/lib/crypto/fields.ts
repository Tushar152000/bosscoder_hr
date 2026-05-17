/**
 * Source of truth for which fields are stored encrypted.
 * - Adding a field here is NOT enough — write/read paths must call
 *   `encryptString` / `decryptString` (or use the typed helpers in
 *   `lib/firestore/employees.ts`, `offers.ts`, etc.).
 * - These fields are NOT searchable in Firestore queries; design accordingly.
 */
export const ENCRYPTED_EMPLOYEE_FIELDS = [
  'compensation.ctc',
  'compensation.salary',
  'compensation.bonus',
  'bank.accountNumber',
  'bank.ifsc',
  'bank.beneficiaryName',
  'identity.pan',
  'identity.aadhaar',
  'address.line1',
  'address.line2',
  'address.city',
  'address.state',
  'address.pincode',
  'dob',
  'emergencyContact.name',
  'emergencyContact.phone',
] as const;

export const ENCRYPTED_REVIEW_FIELDS = [
  'managerNotes',
  'privateHrNotes',
  'disciplinaryNotes',
  'compensationDelta',
] as const;

export const ENCRYPTED_OFFER_FIELDS = [
  'candidateEmail',
  'candidatePhone',
  'annualCtc',
  'probationSalary',
  'bodyMarkdown',
] as const;

export type EncryptedEmployeeField = (typeof ENCRYPTED_EMPLOYEE_FIELDS)[number];
export type EncryptedReviewField = (typeof ENCRYPTED_REVIEW_FIELDS)[number];
export type EncryptedOfferField = (typeof ENCRYPTED_OFFER_FIELDS)[number];
