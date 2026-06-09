export type AttendanceStatus =
  | 'present'
  | 'absent'
  | 'half-day'
  | 'leave'
  | 'holiday'
  | 'weekend'
  | 'pending';

export type LeaveType = 'casual' | 'privilege' | 'marriage' | 'medical';

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
  createdAt: string;
}

export interface LeaveBalance {
  employeeId: string;
  casual: { total: number; used: number };
  privilege: { total: number; used: number };
  marriage: { total: number; used: number };
  medical: { total: number; used: number };
  year: number;
}

export const LEAVE_LABELS: Record<LeaveType, string> = {
  casual: 'Casual Leave',
  privilege: 'Privilege Leave',
  marriage: 'Marriage Leave',
  medical: 'Long Term Medical Leave',
};

export const LEAVE_DEFAULTS: Record<LeaveType, number> = {
  casual: 9,
  privilege: 9,
  marriage: 5,
  medical: 10,
};

export const STATUS_DISPLAY: Record<AttendanceStatus, string> = {
  present: 'Present',
  absent: 'Absent',
  'half-day': 'Half Day',
  leave: 'Leave',
  holiday: 'Holiday',
  weekend: 'Weekend',
  pending: 'Pending',
};
