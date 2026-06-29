export type AttendanceStatus =
  | 'present'
  | 'absent'
  | 'half-day'
  | 'leave'
  | 'wfh'
  | 'holiday'
  | 'weekend'
  | 'pending';

export type LeaveType =
  | 'casual'
  | 'half-casual'
  | 'privilege'
  | 'half-privilege'
  | 'marriage'
  | 'half-marriage'
  | 'medical'
  | 'half-medical'
  | 'unpaid'
  | 'unpaid-half'
  | 'wfh';

/** The 6 balance pools (half-day types share their parent pool; wfh is an independent, uncapped tracker). */
export type BalanceKey = 'casual' | 'privilege' | 'marriage' | 'medical' | 'unpaid' | 'wfh';

export type LeaveRequestStatus = 'pending' | 'approved' | 'rejected';

/** Serialized shape returned from server actions — ISO strings, safe for client components. */
export interface AttendanceRecord {
  employeeId: string;
  date: string; // YYYY-MM-DD
  checkIn: string | null; // ISO datetime
  checkOut: string | null;
  status: AttendanceStatus;
  duration: number; // minutes
  remarks: string;
  editedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LeaveRequest {
  id?: string;
  employeeId: string;
  employeeName: string;
  fromDate: string; // YYYY-MM-DD
  toDate: string;
  leaveType: LeaveType;
  reason: string;
  status: LeaveRequestStatus;
  approvedBy: string | null;
  approvedAt: string | null;
  rejectionReason?: string;
  createdAt: string;
}

/** 6 pools — half-day leave types deduct 0.5 from their parent pool.
 *  `wfh` is independent of the leave totals: uncapped (total 0 ⇒ ∞), used is only a running count. */
export interface LeaveBalance {
  employeeId: string;
  casual:    { total: number; used: number };
  privilege: { total: number; used: number };
  marriage:  { total: number; used: number };
  medical:   { total: number; used: number };
  unpaid:    { total: number; used: number };
  wfh:       { total: number; used: number };
  year: number;
}

export const LEAVE_LABELS: Record<LeaveType, string> = {
  casual:           'Casual Leave',
  'half-casual':    'Half Casual Leave',
  privilege:        'Privilege Leave',
  'half-privilege': 'Half Privilege Leave',
  marriage:         'Marriage Leave',
  'half-marriage':  'Half Marriage Leave',
  medical:          'Long Term Medical Leave',
  'half-medical':   'Half Long Term Medical Leave',
  unpaid:           'Unpaid Leave',
  'unpaid-half':    'Unpaid Half Day',
  wfh:              'Work From Home',
};

export const BALANCE_LABELS: Record<BalanceKey, string> = {
  casual:    'Casual Leave',
  privilege: 'Privilege Leave',
  marriage:  'Marriage Leave',
  medical:   'Long Term Medical Leave',
  unpaid:    'Unpaid Leave',
  wfh:       'Work From Home',
};

/** Which balance pool each leave type draws from. */
export const LEAVE_TO_BALANCE: Record<LeaveType, BalanceKey> = {
  casual:           'casual',
  'half-casual':    'casual',
  privilege:        'privilege',
  'half-privilege': 'privilege',
  marriage:         'marriage',
  'half-marriage':  'marriage',
  medical:          'medical',
  'half-medical':   'medical',
  unpaid:           'unpaid',
  'unpaid-half':    'unpaid',
  wfh:              'wfh',
};

/** Days deducted per calendar day for each leave type. */
export const LEAVE_DEDUCTION: Record<LeaveType, number> = {
  casual:           1,
  'half-casual':    0.5,
  privilege:        1,
  'half-privilege': 0.5,
  marriage:         1,
  'half-marriage':  0.5,
  medical:          1,
  'half-medical':   0.5,
  unpaid:           1,
  'unpaid-half':    0.5,
  wfh:              1,
};

/** Default annual allotment per pool (total 0 ⇒ uncapped: unpaid + wfh). */
export const BALANCE_DEFAULT_TOTALS: Record<BalanceKey, number> = {
  casual: 9, privilege: 9, marriage: 5, medical: 10, unpaid: 0, wfh: 0,
};

/**
 * Spill order when a pool runs out. Excess days cascade to the next pool —
 * Casual → Privilege → Unpaid. Every capped pool ultimately overflows to
 * Unpaid, so a balance never goes negative: extra days become unpaid leave.
 */
export const BALANCE_CASCADE: Record<BalanceKey, BalanceKey[]> = {
  casual:    ['casual', 'privilege', 'unpaid'],
  privilege: ['privilege', 'unpaid'],
  marriage:  ['marriage', 'unpaid'],
  medical:   ['medical', 'unpaid'],
  unpaid:    ['unpaid'],
  wfh:       ['wfh'],
};

/** All leave types in display order. */
export const ALL_LEAVE_TYPES: LeaveType[] = [
  'casual', 'half-casual',
  'privilege', 'half-privilege',
  'marriage', 'half-marriage',
  'medical', 'half-medical',
  'unpaid', 'unpaid-half',
  'wfh',
];

/** Leave types that produce half-day attendance records when approved. */
export const HALF_DAY_LEAVE_TYPES = new Set<LeaveType>([
  'half-casual', 'half-privilege', 'half-marriage', 'half-medical', 'unpaid-half',
]);

export const STATUS_DISPLAY: Record<AttendanceStatus, string> = {
  present:    'Present',
  absent:     'Absent',
  'half-day': 'Half Day',
  leave:      'Leave',
  wfh:        'WFH',
  holiday:    'Holiday',
  weekend:    'Weekend',
  pending:    'Pending',
};

// ─── Leave year (Indian financial year: Apr–Mar) ───────────────────────────────

/**
 * Returns the START calendar year of the financial year that contains `date`.
 * FY runs Apr 1 → Mar 31, so e.g. any day in Apr 2026–Mar 2027 ⇒ 2026.
 */
export function financialYearStart(date: Date = new Date()): number {
  // getMonth() is 0-indexed; April = 3.
  return date.getMonth() >= 3 ? date.getFullYear() : date.getFullYear() - 1;
}

/** Human label for a financial year, e.g. 2026 ⇒ "FY26-27". */
export function financialYearLabel(fyStart: number): string {
  return `FY${String(fyStart).slice(2)}-${String(fyStart + 1).slice(2)}`;
}

/** Firestore doc id for an employee's leave-balance pool, keyed by financial year. */
export function leaveBalanceDocId(employeeId: string, date: Date = new Date()): string {
  return `${employeeId}_FY${financialYearStart(date)}`;
}
