import 'server-only';
import { listEmployees, getEmployeeById } from '@/lib/firestore/employees';
import { listHrUsers, type HrUser } from '@/lib/firestore/users';
import type { EmployeePublic } from '@/types/employee';
import type { CelebrationPerson } from './message';

/** A date (default now) as YYYY-MM-DD in India — occasions follow the office calendar, not UTC. */
export function todayIST(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(now);
}

function photoFor(emp: EmployeePublic, users: HrUser[]): string | null {
  const u = users.find((x) => x.employeeId === emp.employeeId) ?? (emp.userUid ? users.find((x) => x.uid === emp.userUid) : undefined);
  return u && !u.photoRemoved ? u.photoURL : null;
}

function toPerson(emp: EmployeePublic, users: HrUser[]): CelebrationPerson {
  return {
    employeeId: emp.employeeId,
    name: emp.displayName,
    designation: emp.designation ?? '',
    department: emp.department ?? '',
    dob: emp.dateOfBirth ?? null,
    joined: todayIST(emp.joiningDate),
    photoURL: photoFor(emp, users),
  };
}

/** Active employees for the composer. Pass `employees` if the page already loaded them. */
export async function listCelebrationPeople(employees?: EmployeePublic[]): Promise<CelebrationPerson[]> {
  const [emps, users] = await Promise.all([employees ?? listEmployees({ status: 'active', limit: 500 }), listHrUsers()]);
  return emps.map((e) => toPerson(e, users));
}

/** One person, plus their work email (for the Slack mention). Null if gone or inactive. */
export async function getCelebrationPerson(employeeId: string): Promise<(CelebrationPerson & { email: string }) | null> {
  const [emp, users] = await Promise.all([getEmployeeById(employeeId), listHrUsers()]);
  if (!emp || !emp.active) return null;
  return { ...toPerson(emp, users), email: emp.email };
}
