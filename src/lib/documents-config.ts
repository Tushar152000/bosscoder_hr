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

/** In-portal link to a stored document — served by /api/documents, which checks access. */
export function documentHref(uid: string, docType: string, version?: number | null): string {
  return `/api/documents/${encodeURIComponent(uid)}/${encodeURIComponent(docType)}${version ? `?v=${version}` : ''}`;
}

/**
 * Whose folder an employee's documents are stored under: their portal login, or —
 * before their first sign-in (e.g. uploaded from the onboarding link) — a
 * placeholder tied to their employee record. Sign-in moves those across
 * (adoptPendingDocuments).
 */
export function documentOwnerKey(emp: { employeeId: string; userUid: string | null }): string {
  return emp.userUid ?? pendingOwnerKey(emp.employeeId);
}

export function pendingOwnerKey(employeeId: string): string {
  return `emp-${employeeId}`;
}
