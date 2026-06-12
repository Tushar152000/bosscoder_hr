import type { DocumentType } from '@/lib/firestore/documents';

export const DOCUMENT_TYPES: { key: DocumentType; label: string; hint: string; optional?: boolean }[] = [
  { key: 'aadhaar', label: 'Aadhaar Card', hint: 'Front & back scan or PDF' },
  { key: 'pan', label: 'PAN Card', hint: 'Clear scan or photo' },
  { key: 'marksheet_10', label: '10th Marksheet', hint: 'All pages, clear and readable' },
  { key: 'marksheet_12', label: '12th Marksheet', hint: 'All pages, clear and readable' },
  { key: 'degree', label: 'Degree Certificate', hint: 'Final degree or provisional certificate, PDF' },
  { key: 'signed_offer_letter', label: 'Signed Offer Letter', hint: 'Your countersigned offer letter, PDF', optional: true },
  { key: 'signed_employment_contract', label: 'Signed Employment Contract', hint: 'Your countersigned employment contract, PDF', optional: true },
];
