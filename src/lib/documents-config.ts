import type { DocumentType } from '@/lib/firestore/documents';

export const DOCUMENT_TYPES: { key: DocumentType; label: string; hint: string }[] = [
  { key: 'aadhaar', label: 'Aadhaar Card', hint: 'Front & back scan or PDF' },
  { key: 'pan', label: 'PAN Card', hint: 'Clear scan or photo' },
  { key: 'marksheet_10', label: '10th Marksheet', hint: 'All pages, clear and readable' },
  { key: 'marksheet_12', label: '12th Marksheet', hint: 'All pages, clear and readable' },
];
