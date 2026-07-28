import type { EncryptedField } from '@/lib/crypto/encrypt';

export type EmploymentType = 'full-time' | 'internship';
export type OfferStatus = 'draft' | 'finalized' | 'archived';
export type TemplateKey = 'sales-ops' | 'other-dept' | 'intern' | 'relieving' | 'experience';
export type PocName = 'Shreya' | 'Charvi';

/**
 * What we render the letter from. Drives the form, the live preview, and the
 * salary breakdown table (which is auto-computed from `annualBaseCtc` +
 * `annualVariableCtc` + `includePf`).
 */
export interface OfferData {
  // Candidate
  candidateName: string;
  candidateEmail: string;
  candidatePhone: string;

  // Type + scope
  employmentType: EmploymentType;
  department: string;
  templateKey: TemplateKey;
  /** Goes into the "selected for a full-time role of {{designation}}" line. */
  designation: string;

  // Dates (YYYY-MM-DD strings — render formats them)
  offerDate: string;
  joiningDate: string;

  // ── Compensation (canonical numeric values; the salary table is derived) ──
  /** Annual Base CTC in INR (numeric). Rendered as "Rs. 12,00,000/-" via Indian number formatter. */
  annualBaseCtc: number;
  /** Annual Variable CTC in INR. 0 = no variable section in the table. Sales/Ops only typically. */
  annualVariableCtc: number;
  /** Free-text inline phrase shown in the opening sales paragraph,
   *  e.g. "0.75% variable" or "30% commission". Optional. */
  variableRateText: string;
  /** When true, the salary table includes the employer + employee PF rows. */
  includePf: boolean;
  /** Monthly PF amount per side (employer's = employee's). Default ₹1,800
   *  (statutory: 12% of ₹15,000 basic cap). User-editable per offer. */
  pfAmountMonthly: number;
  /** When true, the BST sales performance-incentives addendum is appended
   *  after the sign-off block. Sales templates only. */
  includeBstIncentives: boolean;

  // ── Tenure ──
  probationMonths: number; // typical default: 2
  internshipDurationMonths: number; // typical default: 6 (only used by intern template)

  // ── Point of contact ──
  pocName: string;
  pocDesignation: string;
  pocEmail: string;

  /** Markdown body — pre-filled from a template, fully editable.
   *  Use `{{salaryTable}}` placeholder where the auto-generated comp table goes. */
  bodyMarkdown: string;
}

/** Stored shape — sensitive fields are ciphertext. Numbers are encrypted as strings. */
export interface OfferLetterStored {
  offerId: string;
  candidateName: string;
  // Plaintext (not encrypted) — matches how hr_employees.email is stored,
  // and lets the list page search/filter by email without bulk-decrypting.
  candidateEmail: string;
  candidatePhone: EncryptedField | null;

  employmentType: EmploymentType;
  department: string;
  templateKey: TemplateKey;
  designation: string;

  offerDate: string;
  joiningDate: string;

  // encrypted (numeric values stored as strings of digits):
  annualBaseCtc: EncryptedField | null;
  annualVariableCtc: EncryptedField | null;

  variableRateText: string;
  includePf: boolean;
  pfAmountMonthly: number;
  includeBstIncentives: boolean;

  probationMonths: number;
  internshipDurationMonths: number;

  pocName: string;
  pocDesignation: string;
  pocEmail: string;

  // encrypted (full body, since it contains the comp values inline):
  bodyMarkdown: EncryptedField | null;

  status: OfferStatus;
  createdBy: string;
  createdByEmail: string;
  createdAt: FirebaseFirestore.Timestamp | FirebaseFirestore.FieldValue;
  updatedAt: FirebaseFirestore.Timestamp | FirebaseFirestore.FieldValue;
  finalizedAt: FirebaseFirestore.Timestamp | null;
}

/** Decrypted shape returned by the read helpers. */
export interface OfferLetter extends OfferData {
  offerId: string;
  status: OfferStatus;
  createdBy: string;
  createdByEmail: string;
  createdAt: Date | null;
  updatedAt: Date | null;
  finalizedAt: Date | null;
}

/** Settings doc — single full-page background image (header + watermark + footer
 *  baked in) plus POC defaults. */

export interface OfferSettings {
  backgroundUrl: string;
  pocOptions: { name: string; designation: string; email: string }[];
  defaultDesignations?: Record<string, string>;
}

/** Bosscoder Academy's official letter background — used unless overridden. */
export const DEFAULT_BACKGROUND_URL =
  'https://pub-cdc9316b62e744c4a523488eb3b2a113.r2.dev/Creative%201.jpg';

export const DEFAULT_OFFER_SETTINGS: OfferSettings = {
  backgroundUrl: DEFAULT_BACKGROUND_URL,
  pocOptions: [
    {
      name: 'Shreya Gupta',
      designation: 'Human Resources Associate',
      email: 'shreya.gupta@bosscoderacademy.com',
    },
    {
      name: 'Charvi Madaan',
      designation: 'Human Resource Executive',
      email: 'charvi.madaan@bosscoderacademy.com',
    },
  ],
};

export const POC_PRESETS: { value: PocName; label: string; designation: string }[] = [
  { value: 'Shreya', label: 'Shreya', designation: 'Human Resources Associate' },
  { value: 'Charvi', label: 'Charvi', designation: 'Human Resources Associate' },
];
