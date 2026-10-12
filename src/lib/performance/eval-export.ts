import { DEPARTMENTS } from '@/lib/constants/departments';
import { formatDate } from '@/lib/format';
import type { ReviewSubmission, SubmissionStatus } from '@/types/review';

export const UNASSIGNED_DEPT = '— Unassigned —';

export const STATUS_LABEL: Record<SubmissionStatus, string> = {
  submitted: 'Submitted',
  'in-progress': 'In progress',
  'not-started': 'Not started',
  locked: 'Locked',
};

export const isDone = (s: ReviewSubmission) => s.status === 'submitted' || s.status === 'locked';

export interface EvalViewer {
  email: string;
  uid: string;
  employeeId: string | null;
}

/**
 * Self-evals grouped by department — known DEPARTMENTS first (canonical order), then
 * the rest. The viewer's own self-eval is skipped (it's shown separately on the page).
 */
export function groupSelfEvalsByDept(
  subs: ReviewSubmission[],
  viewer: EvalViewer,
  hideOwn = true,
): [string, ReviewSubmission[]][] {
  const g = new Map<string, ReviewSubmission[]>();
  for (const s of subs) {
    if (hideOwn) {
      const isMe =
        (s.reviewerUid && s.reviewerUid === viewer.uid) ||
        s.reviewerEmail.toLowerCase() === viewer.email ||
        (viewer.employeeId && s.subjectEmployeeId === viewer.employeeId);
      if (isMe) continue;
    }
    const k = s.subjectDepartment || UNASSIGNED_DEPT;
    if (!g.has(k)) g.set(k, []);
    g.get(k)!.push(s);
  }
  const known = DEPARTMENTS.filter((d) => g.has(d));
  const rest = [...g.keys()].filter((d) => !(DEPARTMENTS as readonly string[]).includes(d));
  return [...known, ...rest].map((d) => [d, g.get(d)!]);
}

/** One CSV row per person — statuses and overall rating only, no answers or notes. */
export interface EvalExportRow {
  department: string;
  name: string;
  email: string;
  selfEval: string;
  selfSubmittedOn: string;
  manager: string;
  managerEval: string;
  rating: string;
}

export function toEvalExportRows(
  groups: [string, ReviewSubmission[]][],
  managerBySubject: Record<string, ReviewSubmission>,
): EvalExportRow[] {
  return groups.flatMap(([department, subs]) =>
    subs.map((s) => {
      const mgr = managerBySubject[s.subjectEmployeeId] ?? null;
      const rating = mgr && isDone(mgr) ? mgr.managerOverallRating : null;
      return {
        department,
        name: s.subjectName,
        email: s.subjectEmail,
        selfEval: STATUS_LABEL[s.status],
        selfSubmittedOn: isDone(s) && s.submittedAt ? formatDate(s.submittedAt) : '',
        manager: mgr?.reviewerName ?? '',
        // Same wording as the Manager rating cell on screen.
        managerEval: !mgr ? 'No manager' : isDone(mgr) ? 'Submitted' : mgr.status === 'in-progress' ? 'In progress' : 'Awaiting',
        rating: rating != null ? rating.toFixed(1) : '',
      };
    }),
  );
}

/** Trigger a browser download of `rows` as an Excel-friendly CSV. */
export function downloadEvalCsv(rows: EvalExportRow[], fileName: string) {
  const header = [
    'Department', 'Employee', 'Email', 'Self-eval', 'Self-eval submitted on',
    'Manager', 'Manager eval', 'Manager rating (/5)',
  ];
  const body = rows.map((r) => [
    r.department, r.name, r.email, r.selfEval, r.selfSubmittedOn, r.manager, r.managerEval, r.rating,
  ]);
  const csv = [header, ...body]
    .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
    .join('\r\n');
  // BOM so Excel reads the file as UTF-8 (names, the en dash in the cycle label).
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}
