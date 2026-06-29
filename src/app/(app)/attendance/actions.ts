'use server';

import { revalidatePath } from 'next/cache';
import { adminDb, Timestamp, FieldValue } from '@/lib/firebase/admin';
import { HR } from '@/lib/firebase/collections';
import { requireUser } from '@/lib/auth/guard';
import { hasAnyRole } from '@/lib/auth/roles';
import { listEmployees, getEmployeeById } from '@/lib/firestore/employees';
import { writeNotificationsForReviewers } from '@/lib/firestore/notifications';
import { listHrUsers } from '@/lib/firestore/users';
import { isPrivileged } from '@/lib/auth/roles';
import { sendLeaveRequestEmail } from '@/lib/email/leave-request';
import type {
  AttendanceRecord,
  AttendanceStatus,
  BalanceKey,
  LeaveBalance,
  LeaveRequest,
  LeaveType,
} from '@/types/attendance';
import { HALF_DAY_LEAVE_TYPES, LEAVE_DEDUCTION, LEAVE_LABELS, LEAVE_TO_BALANCE, BALANCE_DEFAULT_TOTALS, BALANCE_CASCADE, financialYearStart, leaveBalanceDocId } from '@/types/attendance';

export type TeamMember = {
  employeeId: string;
  displayName: string;
  designation: string;
  department: string;
  managerId: string | null;
};

export type ActionResult<T = void> =
  | ({ ok: true } & (T extends void ? object : { data: T }))
  | { ok: false; error: string };

const RECORDS = HR.attendanceRecords;
const LEAVE_REQUESTS = HR.leaveRequests;
const LEAVE_BALANCES = HR.leaveBalances;

function tsToISO(ts: FirebaseFirestore.Timestamp | null | undefined): string | null {
  if (!ts || typeof ts.toDate !== 'function') return null;
  return ts.toDate().toISOString();
}

function docToRecord(data: FirebaseFirestore.DocumentData): AttendanceRecord {
  return {
    employeeId: data.employeeId,
    date: data.date,
    checkIn: tsToISO(data.checkIn),
    checkOut: tsToISO(data.checkOut),
    status: data.status,
    duration: data.duration ?? 0,
    remarks: data.remarks ?? '',
    editedBy: data.editedBy ?? null,
    createdAt: tsToISO(data.createdAt) ?? new Date().toISOString(),
    updatedAt: tsToISO(data.updatedAt) ?? new Date().toISOString(),
  };
}

export async function checkInOut(
  employeeId: string,
): Promise<ActionResult<AttendanceRecord>> {
  await requireUser();

  const now = new Date();
  const date = now.toISOString().split('T')[0]; // YYYY-MM-DD
  const docId = `${employeeId}_${date}`;
  const ref = adminDb.collection(RECORDS).doc(docId);
  const snap = await ref.get();

  if (!snap.exists) {
    await ref.set({
      employeeId,
      date,
      checkIn: Timestamp.fromDate(now),
      checkOut: null,
      status: 'present' as AttendanceStatus,
      duration: 0,
      remarks: '',
      editedBy: null,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    const fresh = await ref.get();
    revalidatePath('/attendance');
    return { ok: true, data: docToRecord(fresh.data()!) };
  }

  const existing = snap.data()!;

  if (existing.checkOut) {
    return { ok: false, error: 'Already checked out for today' };
  }

  const checkInTime = (existing.checkIn as FirebaseFirestore.Timestamp).toDate();
  const duration = Math.floor((now.getTime() - checkInTime.getTime()) / 60_000);
  const status: AttendanceStatus = duration < 240 ? 'half-day' : 'present';

  await ref.update({
    checkOut: Timestamp.fromDate(now),
    duration,
    status,
    updatedAt: FieldValue.serverTimestamp(),
  });

  const updated = await ref.get();
  revalidatePath('/attendance');
  return { ok: true, data: docToRecord(updated.data()!) };
}

/** Fetches all records for a given month using batch doc reads — no composite index needed. */
export async function getMonthAttendance(
  employeeId: string,
  year: number,
  month: number, // 1-indexed
): Promise<AttendanceRecord[]> {
  await requireUser();

  const daysInMonth = new Date(year, month, 0).getDate();
  const pad = (n: number) => String(n).padStart(2, '0');

  const refs = Array.from({ length: daysInMonth }, (_, i) => {
    const date = `${year}-${pad(month)}-${pad(i + 1)}`;
    return adminDb.collection(RECORDS).doc(`${employeeId}_${date}`);
  });

  const snaps = await adminDb.getAll(...refs);
  return snaps.filter((s) => s.exists).map((s) => docToRecord(s.data()!));
}

export async function getAttendanceRecord(
  employeeId: string,
  date: string,
): Promise<AttendanceRecord | null> {
  await requireUser();
  const snap = await adminDb.collection(RECORDS).doc(`${employeeId}_${date}`).get();
  if (!snap.exists) return null;
  return docToRecord(snap.data()!);
}

export async function editAttendanceRecord(
  employeeId: string,
  date: string,
  updates: {
    remarks?: string;
    status?: AttendanceStatus;
    checkIn?: string | null;
    checkOut?: string | null;
  },
): Promise<ActionResult> {
  const user = await requireUser();
  const isPrivileged = hasAnyRole(user.roles, 'hr', 'founder', 'manager');

  const payload: Record<string, unknown> = {
    remarks: updates.remarks ?? '',
    updatedAt: FieldValue.serverTimestamp(),
    editedBy: user.uid,
  };

  if (isPrivileged) {
    if (updates.status !== undefined) payload.status = updates.status;
    if (updates.checkIn !== undefined) {
      payload.checkIn = updates.checkIn
        ? Timestamp.fromDate(new Date(updates.checkIn))
        : null;
    }
    if (updates.checkOut !== undefined) {
      payload.checkOut = updates.checkOut
        ? Timestamp.fromDate(new Date(updates.checkOut))
        : null;
    }
    if (updates.checkIn && updates.checkOut) {
      payload.duration = Math.floor(
        (new Date(updates.checkOut).getTime() - new Date(updates.checkIn).getTime()) /
          60_000,
      );
    }
  }

  try {
    const ref = adminDb.collection(RECORDS).doc(`${employeeId}_${date}`);
    const snap = await ref.get();
    if (!snap.exists) {
      await ref.set({
        employeeId,
        date,
        checkIn: null,
        checkOut: null,
        status: 'absent' as AttendanceStatus,
        duration: 0,
        createdAt: FieldValue.serverTimestamp(),
        ...payload,
      });
    } else {
      await ref.update(payload);
    }
    revalidatePath('/attendance');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Update failed' };
  }
}

export async function getLeaveBalance(employeeId: string): Promise<LeaveBalance> {
  await requireUser();
  const year = financialYearStart();
  const snap = await adminDb
    .collection(LEAVE_BALANCES)
    .doc(leaveBalanceDocId(employeeId))
    .get();

  const d = snap.exists ? snap.data()! : {};
  return {
    employeeId,
    year,
    casual:    d.casual    ?? { total: 9,  used: 0 },
    privilege: d.privilege ?? { total: 9,  used: 0 },
    marriage:  d.marriage  ?? { total: 5,  used: 0 },
    medical:   d.medical   ?? { total: 10, used: 0 },
    unpaid:    d.unpaid    ?? { total: 0,  used: 0 },
    wfh:       d.wfh       ?? { total: 0,  used: 0 },
  };
}

export async function applyLeave(data: {
  employeeId: string;
  employeeName: string;
  fromDate: string;
  toDate: string;
  leaveType: LeaveType;
  reason: string;
}): Promise<ActionResult> {
  await requireUser();

  try {
    await adminDb.collection(LEAVE_REQUESTS).add({
      ...data,
      status: 'pending',
      approvedBy: null,
      approvedAt: null,
      createdAt: FieldValue.serverTimestamp(),
    });

    // Notify the reporting manager — best-effort, never blocks the submission.
    await notifyManagerOfLeave(data).catch((e) => {
      console.error('[applyLeave] manager notification failed:', e);
    });

    revalidatePath('/attendance');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed to submit leave' };
  }
}

/**
 * Notifies the reviewer(s) of a new leave request, via both the in-app
 * notification bell and email. The reviewer is the applicant's reporting
 * manager; if no manager is on record, it falls back to all active HR users
 * so the request is never silently stranded. Best-effort: any failure here is
 * logged but does not fail the leave submission itself.
 */
async function notifyManagerOfLeave(data: {
  employeeId: string;
  employeeName: string;
  fromDate: string;
  toDate: string;
  leaveType: LeaveType;
  reason: string;
}): Promise<void> {
  // Resolve recipients: reporting manager, or HR fallback when none exists.
  const recipients: { uid: string | null; email: string | null; displayName: string }[] = [];

  const applicant = await getEmployeeById(data.employeeId);
  const manager = applicant?.managerId ? await getEmployeeById(applicant.managerId) : null;

  if (manager) {
    recipients.push({ uid: manager.userUid, email: manager.email, displayName: manager.displayName });
  } else {
    // No reporting manager on record — fall back to active HR.
    const hrUsers = (await listHrUsers()).filter(
      (u) => u.active && isPrivileged(u.roles),
    );
    for (const u of hrUsers) {
      recipients.push({ uid: u.uid, email: u.email, displayName: u.displayName ?? u.email });
    }
  }

  if (recipients.length === 0) return;

  const leaveTypeLabel = LEAVE_LABELS[data.leaveType];
  const range = data.fromDate === data.toDate ? data.fromDate : `${data.fromDate}–${data.toDate}`;

  // In-app notifications (keyed by each reviewer's auth uid).
  await writeNotificationsForReviewers(
    recipients
      .filter((r) => r.uid)
      .map((r) => ({
        uid: r.uid!,
        title: `${data.employeeName} requested ${leaveTypeLabel} (${range})`,
        href: '/attendance',
        tone: 'info' as const,
      })),
  );

  // Email notifications.
  await Promise.all(
    recipients
      .filter((r) => r.email)
      .map((r) =>
        sendLeaveRequestEmail({
          to: r.email!,
          managerName: r.displayName,
          employeeName: data.employeeName,
          leaveTypeLabel,
          fromDate: data.fromDate,
          toDate: data.toDate,
          reason: data.reason,
        }),
      ),
  );
}

// ─── Leave request history ────────────────────────────────────────────────────

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

export async function getMyLeaveRequests(employeeId: string): Promise<LeaveRequest[]> {
  await requireUser();
  const snap = await adminDb
    .collection(LEAVE_REQUESTS)
    .where('employeeId', '==', employeeId)
    .get();
  return snap.docs
    .map((d) => docToLeaveRequest(d.id, d.data()))
    .sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1))
    .slice(0, 20);
}

// ─── Manager actions ──────────────────────────────────────────────────────────

function getDatesInRange(fromDate: string, toDate: string): string[] {
  const dates: string[] = [];
  const current = new Date(fromDate + 'T00:00:00');
  const end = new Date(toDate + 'T00:00:00');
  while (current <= end) {
    dates.push(current.toISOString().split('T')[0]);
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

export async function getTeamMembers(managerId: string): Promise<TeamMember[]> {
  await requireUser();
  const employees = await listEmployees({ managerId });
  return employees.map((e) => ({
    employeeId: e.employeeId,
    displayName: e.displayName,
    designation: e.designation,
    department: e.department,
    managerId: e.managerId,
  }));
}

export async function getTeamMonthAttendance(
  employeeIds: string[],
  year: number,
  month: number,
): Promise<AttendanceRecord[]> {
  await requireUser();
  if (employeeIds.length === 0) return [];

  const daysInMonth = new Date(year, month, 0).getDate();
  const pad = (n: number) => String(n).padStart(2, '0');

  const allRefs: FirebaseFirestore.DocumentReference[] = [];
  for (const empId of employeeIds) {
    for (let d = 1; d <= daysInMonth; d++) {
      const date = `${year}-${pad(month)}-${pad(d)}`;
      allRefs.push(adminDb.collection(RECORDS).doc(`${empId}_${date}`));
    }
  }

  const CHUNK = 500;
  const results: AttendanceRecord[] = [];
  for (let i = 0; i < allRefs.length; i += CHUNK) {
    const chunk = allRefs.slice(i, i + CHUNK);
    const snaps = await adminDb.getAll(...chunk);
    for (const snap of snaps) {
      if (snap.exists) results.push(docToRecord(snap.data()!));
    }
  }
  return results;
}

export async function getPendingLeaveRequestsForTeam(
  employeeIds: string[],
): Promise<LeaveRequest[]> {
  await requireUser();
  if (employeeIds.length === 0) return [];

  const CHUNK = 10;
  const results: LeaveRequest[] = [];
  for (let i = 0; i < employeeIds.length; i += CHUNK) {
    const chunk = employeeIds.slice(i, i + CHUNK);
    const snap = await adminDb
      .collection(LEAVE_REQUESTS)
      .where('employeeId', 'in', chunk)
      .get();
    for (const doc of snap.docs) {
      results.push(docToLeaveRequest(doc.id, doc.data()));
    }
  }
  return results;
}

export async function approveLeave(leaveId: string): Promise<ActionResult> {
  const user = await requireUser();
  if (!hasAnyRole(user.roles, 'manager', 'hr', 'founder')) {
    return { ok: false, error: 'Forbidden' };
  }

  const leaveRef = adminDb.collection(LEAVE_REQUESTS).doc(leaveId);
  const leaveSnap = await leaveRef.get();
  if (!leaveSnap.exists) return { ok: false, error: 'Leave request not found' };

  const leave = leaveSnap.data()!;
  if (leave.status !== 'pending') return { ok: false, error: 'Request already processed' };

  const { employeeId, fromDate, toDate, leaveType } = leave as {
    employeeId: string;
    fromDate: string;
    toDate: string;
    leaveType: LeaveType;
    reason: string;
  };
  const dates = getDatesInRange(fromDate, toDate);
  const daysCount = dates.length;
  const batch = adminDb.batch();

  const recordStatus: AttendanceStatus =
    leaveType === 'wfh'
      ? 'wfh'
      : HALF_DAY_LEAVE_TYPES.has(leaveType)
      ? 'half-day'
      : 'leave';

  batch.update(leaveRef, {
    status: 'approved',
    approvedBy: user.uid,
    approvedAt: FieldValue.serverTimestamp(),
  });

  for (const date of dates) {
    const recRef = adminDb.collection(RECORDS).doc(`${employeeId}_${date}`);
    batch.set(
      recRef,
      {
        employeeId,
        date,
        checkIn: null,
        checkOut: null,
        status: recordStatus,
        duration: 0,
        remarks: `${leaveType === 'wfh' ? 'WFH' : 'Leave'}: ${leave.reason ?? ''}`,
        editedBy: user.uid,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  }

  const fromDateObj = new Date(fromDate + 'T00:00:00');
  const year = financialYearStart(fromDateObj);
  const balanceRef = adminDb.collection(LEAVE_BALANCES).doc(leaveBalanceDocId(employeeId, fromDateObj));
  const balanceSnap = await balanceRef.get();
  const balanceKey = LEAVE_TO_BALANCE[leaveType];
  const deduction = LEAVE_DEDUCTION[leaveType] * daysCount;

  // Load current pools (existing values, falling back to defaults), then spill
  // the deduction across the cascade chain (e.g. casual → privilege → unpaid),
  // so an exhausted pool overflows to the next instead of going negative.
  const balData = balanceSnap.exists ? balanceSnap.data()! : {};
  const pools = {} as Record<BalanceKey, { total: number; used: number }>;
  for (const k of Object.keys(BALANCE_DEFAULT_TOTALS) as BalanceKey[]) {
    pools[k] = {
      total: balData[k]?.total ?? BALANCE_DEFAULT_TOTALS[k],
      used: balData[k]?.used ?? 0,
    };
  }

  const chain = BALANCE_CASCADE[balanceKey];
  let remaining = deduction;
  for (const pool of chain) {
    if (remaining <= 0) break;
    const cur = pools[pool];
    if (cur.total === 0) {
      // Bottomless pool (unpaid / wfh) — absorb the rest.
      cur.used += remaining;
      remaining = 0;
    } else {
      const take = Math.min(Math.max(0, cur.total - cur.used), remaining);
      cur.used += take;
      remaining -= take;
    }
  }
  if (remaining > 0) pools[chain[chain.length - 1]].used += remaining;

  const balPayload: Record<string, unknown> = { employeeId, year };
  for (const k of Object.keys(BALANCE_DEFAULT_TOTALS)) balPayload[k] = pools[k as BalanceKey];
  batch.set(balanceRef, balPayload, { merge: true });

  try {
    await batch.commit();
    revalidatePath('/attendance');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed to approve leave' };
  }
}

export async function rejectLeave(leaveId: string, rejectionReason?: string): Promise<ActionResult> {
  const user = await requireUser();
  if (!hasAnyRole(user.roles, 'manager', 'hr', 'founder')) {
    return { ok: false, error: 'Forbidden' };
  }

  const leaveRef = adminDb.collection(LEAVE_REQUESTS).doc(leaveId);
  const leaveSnap = await leaveRef.get();
  if (!leaveSnap.exists) return { ok: false, error: 'Leave request not found' };

  if (leaveSnap.data()!.status !== 'pending') {
    return { ok: false, error: 'Request already processed' };
  }

  try {
    await leaveRef.update({
      status: 'rejected',
      approvedBy: user.uid,
      approvedAt: FieldValue.serverTimestamp(),
      ...(rejectionReason?.trim() && { rejectionReason: rejectionReason.trim() }),
    });
    revalidatePath('/attendance');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Failed to reject leave' };
  }
}
