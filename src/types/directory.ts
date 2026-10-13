import type { EmploymentType, EmployeeStatus } from '@/types/employee';

/** One row in the employee directory. Everyone appears exactly once. */
export interface DirectoryPerson {
  id: string;
  name: string;
  email: string;
  designation: string;
  /** Empty string when not set. */
  department: string;
  avatarColor: string;
  initials: string;
  /** Display date, e.g. "12 Mar 2024". */
  joinedAt: string;
  /** ISO date for sorting. */
  joinedISO: string;
  status: EmployeeStatus;
  employmentType: EmploymentType;
  photoURL?: string | null;
  /** Null when no manager is set (or the manager isn't in this list). */
  managerId: string | null;
  managerName: string | null;
  reportsCount: number;
  /** Everyone below this person in the reporting line. */
  teamSize: number;
  isFounder: boolean;
  /**
   * Open review cycle progress — only sent to people who manage cycles.
   * 'none' = no form for this person in the cycle.
   */
  evals?: { self: EvalState; manager: EvalState };
}

export type EvalState = 'pending' | 'submitted' | 'none';
