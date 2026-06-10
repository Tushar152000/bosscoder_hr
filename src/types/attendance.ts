export type AttendanceStatus =
  | 'present'
  | 'absent'
  | 'half-day'
  | 'leave'
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
  | 'unpaid-half';

/** The 5 balance pools (half-day types share their parent pool). */
export type BalanceKey = 'casual' | 'privilege' | 'marriage' | 'medical' | 'unpaid';

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

/** Only 5 pools — half-day leave types deduct 0.5 from their parent pool. */
export interface LeaveBalance {
  employeeId: string;
  casual:    { total: number; used: number };
  privilege: { total: number; used: number };
  marriage:  { total: number; used: number };
  medical:   { total: number; used: number };
  unpaid:    { total: number; used: number };
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
};

export const BALANCE_LABELS: Record<BalanceKey, string> = {
  casual:    'Casual Leave',
  privilege: 'Privilege Leave',
  marriage:  'Marriage Leave',
  medical:   'Long Term Medical Leave',
  unpaid:    'Unpaid Leave',
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
};

/** All leave types in display order. */
export const ALL_LEAVE_TYPES: LeaveType[] = [
  'casual', 'half-casual',
  'privilege', 'half-privilege',
  'marriage', 'half-marriage',
  'medical', 'half-medical',
  'unpaid', 'unpaid-half',
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
  holiday:    'Holiday',
  weekend:    'Weekend',
  pending:    'Pending',
};
