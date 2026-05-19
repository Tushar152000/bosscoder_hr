import { Crown, Briefcase, Users, User } from 'lucide-react';
import type { ElementType } from 'react';
import type { Permission, Role } from '@/lib/auth/roles';

export const ROLE_META: Record<
  Role,
  { label: string; icon: ElementType; pillColor: string; pillBg: string; description: string }
> = {
  founder: {
    label: 'Founder',
    icon: Crown,
    pillColor: '#854F0B',
    pillBg: '#FAEEDA',
    description: 'Full access. All 7 permissions auto-granted on assignment.',
  },
  hr: {
    label: 'HR',
    icon: Briefcase,
    pillColor: '#0C447C',
    pillBg: '#E6F1FB',
    description: 'HR ops — manage employees, run review cycles, generate offer letters.',
  },
  manager: {
    label: 'Manager',
    icon: Users,
    pillColor: '#534AB7',
    pillBg: '#EEEDFE',
    description: 'Sees their org-tree subtree on the directory.',
  },
  employee: {
    label: 'Employee',
    icon: User,
    pillColor: '#5F6B7A',
    pillBg: '#FFFFFF',
    description: 'Default. Sees the directory, can fill their own self-eval.',
  },
};

export const PERMISSION_META: Record<
  Permission,
  { label: string; description: string; founderOnly?: boolean }
> = {
  view_compensation: {
    label: 'view_compensation',
    description: 'Read salary / CTC / bonus on employee profiles.',
  },
  view_personal_documents: {
    label: 'view_personal_documents',
    description: 'Read PAN, Aadhaar, address, DOB, emergency contact.',
  },
  manage_employees: {
    label: 'manage_employees',
    description: 'Create / edit / deactivate employee records.',
  },
  manage_review_cycles: {
    label: 'manage_review_cycles',
    description: 'Create, open, and close performance review cycles.',
  },
  manage_offer_letters: {
    label: 'manage_offer_letters',
    description: 'Create, edit, and download offer letters for new hires and interns.',
  },
  manage_roles: {
    label: 'manage_roles',
    description: 'Assign roles & permissions on this page. Powerful — keep tight.',
    founderOnly: true,
  },
  view_audit_log: {
    label: 'view_audit_log',
    description: 'See full history of privileged reads and admin changes.',
  },
};
