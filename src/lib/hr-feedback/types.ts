/** Shared (client-safe) types and labels for feedback sent to the HR team. */

export const HR_FEEDBACK_CATEGORIES = [
  'workplace',
  'policy',
  'manager',
  'pay',
  'idea',
  'other',
] as const;
export type HrFeedbackCategory = (typeof HR_FEEDBACK_CATEGORIES)[number];

export const CATEGORY_LABEL: Record<HrFeedbackCategory, string> = {
  workplace: 'Workplace and culture',
  policy: 'Policies and leave',
  manager: 'Manager or team',
  pay: 'Pay and benefits',
  idea: 'Idea or suggestion',
  other: 'Something else',
};

/** Category colours, taken from the avatar palette. */
export const CATEGORY_COLOR: Record<HrFeedbackCategory, string> = {
  workplace: '#1D9E75',
  policy: '#378ADD',
  manager: '#534AB7',
  pay: '#BA7517',
  idea: '#0C447C',
  other: '#94A3B8',
};

export const HR_FEEDBACK_STATUSES = ['new', 'in-review', 'resolved'] as const;
export type HrFeedbackStatus = (typeof HR_FEEDBACK_STATUSES)[number];

/** Labels HR sees. */
export const STATUS_LABEL: Record<HrFeedbackStatus, string> = {
  new: 'New',
  'in-review': 'In review',
  resolved: 'Resolved',
};

export const MESSAGE_MAX = 3000;
export const RESPONSE_MAX = 2000;

/** A feedback item as sent to the browser. Dates are ISO strings. */
export interface HrFeedbackItem {
  id: string;
  category: HrFeedbackCategory;
  message: string;
  anonymous: boolean;
  /** Sender details — all null when anonymous. */
  uid: string | null;
  name: string | null;
  email: string | null;
  designation: string | null;
  department: string | null;
  status: HrFeedbackStatus;
  /** Reply shown to the sender (named feedback only). */
  response: string | null;
  respondedAt: string | null;
  handledByName: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}
