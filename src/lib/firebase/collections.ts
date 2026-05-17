/**
 * All HR data lives in collections prefixed with `hr_` so it can co-exist
 * with the existing bosscoderplatformindia Firestore data without overlap.
 * Always reference collections through these constants.
 */
export const HR = {
  users: 'hr_users',
  employees: 'hr_employees',
  teams: 'hr_teams',
  permissions: 'hr_permissions',
  reviewCycles: 'hr_review_cycles',
  reviewSubmissions: 'hr_review_submissions',
  offerLetters: 'hr_offer_letters',
  settings: 'hr_settings',
  notifications: 'hr_notifications',
  auditLogs: 'hr_audit_logs',
} as const;

export type HrCollection = (typeof HR)[keyof typeof HR];
