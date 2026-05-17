import type { EmployeeInput } from '@/types/employee';

export type ManagerOption = {
  employeeId: string;
  displayName: string;
  designation: string;
};

export type SetTopField = <K extends keyof EmployeeInput>(k: K, v: EmployeeInput[K]) => void;
