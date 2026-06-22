'use server';

import { revalidatePath } from 'next/cache';
import { adminDb, FieldValue } from '@/lib/firebase/admin';
import { HR } from '@/lib/firebase/collections';
import { requireUser } from '@/lib/auth/guard';
import { hasAnyRole } from '@/lib/auth/roles';
import { listEmployees } from '@/lib/firestore/employees';
import { writeAuditLog } from '@/lib/audit';
import type { LeaveRequest, AttendanceStatus, BalanceKey } from '@/types/attendance';
import { financialYearStart, leaveBalanceDocId } from '@/types/attendance';

type BalanceEntry = { total: number; used: number };

const BALANCE_DEFAULTS: Record<BalanceKey, number> = {
  casual: 9, privilege: 9, marriage: 5, medical: 10, unpaid: 0, wfh: 0,
};

export type EmployeeAttendanceToday = {
  employeeId: string;
  displayName: string;
  department: string;
  designation: string;
  status: AttendanceStatus | null;
};

export type EmployeeLeaveBalance = {
  employeeId: string;
  displayName: string;
  department: string;
  designation: string;
  year: number;
  casual:    { total: number; used: number };
  privilege: { total: number; used: number };
  marriage:  { total: number; used: number };
  medical:   { total: number; used: number };
  unpaid:    { total: number; used: number };
  wfh:       { total: number; used: number };
  updatedByEmail: string | null;
  updatedAt: string | null; // ISO
};

function tsToISO(ts: FirebaseFirestore.Timestamp | null | undefined): string | null {
  if (!ts || typeof ts.toDate !== 'function') return null;
  return ts.toDate().toISOString();
}

function docToLeaveRequest(id: string, data: FirebaseFirestore.DocumentData): LeaveRequest {
  return {
    id,
    employeeId: data.employeeId,
    employeeName: data.employeeName ?? '',
    fromDate: data.fromDate,
    toDate: data.toDate,
    leaveType: data.leaveType,
    reason: data.reason ?? '',
    status: data.status,
    approvedBy: data.approvedBy ?? null,
    approvedAt: tsToISO(data.approvedAt),
    rejectionReason: data.rejectionReason ?? undefined,
    createdAt: tsToISO(data.createdAt) ?? new Date().toISOString(),
  };
}

export async function getAllEmployeesAttendanceToday(): Promise<EmployeeAttendanceToday[]> {
  const user = await requireUser();
  if (!hasAnyRole(user.roles, 'hr', 'founder')) throw new Error('Forbidden');

  const today = new Date().toISOString().split('T')[0];

  const [employees, recordsSnap] = await Promise.all([
    listEmployees(),
    adminDb.collection(HR.attendanceRecords).where('date', '==', today).get(),
  ]);

  const statusMap = new Map<string, AttendanceStatus>();
  for (const doc of recordsSnap.docs) {
    const d = doc.data();
    statusMap.set(d.employeeId as string, d.status as AttendanceStatus);
  }

  return employees.map((emp) => ({
    employeeId: emp.employeeId,
    displayName: emp.displayName,
    department: emp.department,
    designation: emp.designation,
    status: statusMap.get(emp.employeeId) ?? null,
  }));
}

export async function getAllLeaveBalances(): Promise<EmployeeLeaveBalance[]> {
  const user = await requireUser();
  if (!hasAnyRole(user.roles, 'hr', 'founder')) throw new Error('Forbidden');

  const year = financialYearStart();
  const yearSuffix = `_FY${year}`;

  const [employees, balancesSnap] = await Promise.all([
    listEmployees(),
    adminDb.collection(HR.leaveBalances).get(),
  ]);

  const balanceMap = new Map<string, FirebaseFirestore.DocumentData>();
  for (const doc of balancesSnap.docs) {
    if (doc.id.endsWith(yearSuffix)) {
      const d = doc.data();
      balanceMap.set(d.employeeId as string, d);
    }
  }

  return employees.map((emp) => {
    const d = balanceMap.get(emp.employeeId) ?? {};
    return {
      employeeId: emp.employeeId,
      displayName: emp.displayName,
      department: emp.department,
      designation: emp.designation,
      year,
      casual:    d.casual    ?? { total: 9,  used: 0 },
      privilege: d.privilege ?? { total: 9,  used: 0 },
      marriage:  d.marriage  ?? { total: 5,  used: 0 },
      medical:   d.medical   ?? { total: 10, used: 0 },
      unpaid:    d.unpaid    ?? { total: 0,  used: 0 },
      wfh:       d.wfh       ?? { total: 0,  used: 0 },
      updatedByEmail: d.updatedByEmail ?? null,
      updatedAt: tsToISO(d.updatedAt),
    };
  });
}

export async function getAllPendingLeaves(): Promise<LeaveRequest[]> {
  const user = await requireUser();
  if (!hasAnyRole(user.roles, 'hr', 'founder')) throw new Error('Forbidden');

  const snap = await adminDb
    .collection(HR.leaveRequests)
    .where('status', '==', 'pending')
    .get();

  return snap.docs
    .map((d) => docToLeaveRequest(d.id, d.data()))
    .sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1));
}

/** Update one employee's leave balance pools (HR only). */
export async function updateEmployeeLeaveBalance(
  employeeId: string,
  updates: Partial<Record<BalanceKey, BalanceEntry>>,
): Promise<void> {
  const user = await requireUser();
  if (!hasAnyRole(user.roles, 'hr', 'founder')) throw new Error('Forbidden');

  const year = financialYearStart();
  const ref = adminDb.collection(HR.leaveBalances).doc(leaveBalanceDocId(employeeId));

  const payload: Record<string, unknown> = {
    employeeId,
    year,
    updatedBy: user.uid,
    updatedByEmail: user.email,
    updatedAt: FieldValue.serverTimestamp(),
  };
  for (const [key, val] of Object.entries(updates)) {
    payload[key] = val;
  }

  await ref.set(payload, { merge: true });

  await writeAuditLog({
    actorUid: user.uid,
    actorEmail: user.email,
    action: 'leave_balance.update',
    resource: { type: 'leave_balance', id: employeeId },
    metadata: { year, fy: `FY${year}`, pools: updates },
  });

  revalidatePath('/attendance');
}

/** Set leave balance totals for every active employee in a department (HR only).
 *  Only `total` is overwritten; `used` stays untouched. */
export async function bulkUpdateDeptLeaveBalances(
  department: string,
  totals: Partial<Record<BalanceKey, number>>,
): Promise<void> {
  const user = await requireUser();
  if (!hasAnyRole(user.roles, 'hr', 'founder')) throw new Error('Forbidden');

  const year = financialYearStart();
  const yearSuffix = `_FY${year}`;
  const employees = await listEmployees();
  const deptEmps = employees.filter((e) => e.department === department);
  if (deptEmps.length === 0) return;

  const balanceRefs = deptEmps.map((e) =>
    adminDb.collection(HR.leaveBalances).doc(`${e.employeeId}${yearSuffix}`),
  );
  const existingSnaps = await adminDb.getAll(...balanceRefs);
  const existingMap = new Map<string, FirebaseFirestore.DocumentData>();
  for (const snap of existingSnaps) {
    if (snap.exists) existingMap.set(snap.id, snap.data()!);
  }

  const KEYS: BalanceKey[] = ['casual', 'privilege', 'marriage', 'medical', 'unpaid', 'wfh'];
  const CHUNK = 400;

  for (let i = 0; i < deptEmps.length; i += CHUNK) {
    const batch = adminDb.batch();
    for (const emp of deptEmps.slice(i, i + CHUNK)) {
      const ref  = adminDb.collection(HR.leaveBalances).doc(`${emp.employeeId}${yearSuffix}`);
      const prev = existingMap.get(`${emp.employeeId}${yearSuffix}`) ?? {};
      const doc: Record<string, unknown> = {
        employeeId: emp.employeeId,
        year,
        updatedBy: user.uid,
        updatedByEmail: user.email,
        updatedAt: FieldValue.serverTimestamp(),
      };
      for (const key of KEYS) {
        doc[key] = {
          total: totals[key] ?? (prev[key]?.total ?? BALANCE_DEFAULTS[key]),
          used:  prev[key]?.used ?? 0,
        };
      }
      batch.set(ref, doc, { merge: true });
    }
    await batch.commit();
  }

  await writeAuditLog({
    actorUid: user.uid,
    actorEmail: user.email,
    action: 'leave_balance.bulk_update',
    resource: { type: 'leave_balance', id: `dept:${department}` },
    metadata: { department, year, fy: `FY${year}`, totals, employeeCount: deptEmps.length },
  });

  revalidatePath('/attendance');
}
