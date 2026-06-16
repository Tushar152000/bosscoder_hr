import type { EmployeeStatus } from '@/types/employee';

export interface DirectoryPerson {
  id: string;
  name: string;
  email: string;
  designation: string;
  avatarColor: string;
  initials: string;
  joinedAt: string;
  status: EmployeeStatus;
  photoURL?: string | null;
}

export interface DirectoryReport extends DirectoryPerson {
  type: string;
}

export interface DirectoryManager {
  user: DirectoryPerson;
  reports: DirectoryReport[];
}

export interface DirectoryDept {
  id: string;
  name: string;
  memberCount: number;
  managers: DirectoryManager[];
}

export interface DirectoryView {
  departments: DirectoryDept[];
}
