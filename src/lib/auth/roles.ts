export const ROLES = ['founder', 'hr', 'manager', 'employee'] as const;
export type Role = (typeof ROLES)[number];

export const PERMISSIONS = [
  'view_compensation',
  'view_personal_documents',
  'manage_employees',
  'manage_review_cycles',
  'manage_offer_letters',
  'manage_roles',
  'view_audit_log',
] as const;
export type Permission = (typeof PERMISSIONS)[number];

const ROLE_DEFAULTS: Record<Role, readonly Permission[]> = {
  founder: [
    'view_compensation',
    'view_personal_documents',
    'manage_employees',
    'manage_review_cycles',
    'manage_offer_letters',
    'manage_roles',
    'view_audit_log',
  ],
  hr: [
    'view_compensation',
    'view_personal_documents',
    'manage_employees',
    'manage_review_cycles',
    'manage_offer_letters',
    'view_audit_log',
  ],
  manager: [],
  employee: [],
};

export function defaultPermissionsForRoles(roles: readonly Role[]): Permission[] {
  const set = new Set<Permission>();
  for (const r of roles) {
    for (const p of ROLE_DEFAULTS[r] ?? []) set.add(p);
  }
  return [...set];
}

export function hasRole(roles: readonly Role[] | undefined, role: Role): boolean {
  return !!roles?.includes(role);
}

export function hasAnyRole(roles: readonly Role[] | undefined, ...check: Role[]): boolean {
  return !!roles?.some((r) => check.includes(r));
}

export function isPrivileged(roles: readonly Role[] | undefined): boolean {
  return hasAnyRole(roles, 'founder', 'hr');
}

export function founderEmails(): string[] {
  return (process.env.FOUNDER_EMAILS ?? '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export function hrEmails(): string[] {
  return (process.env.HR_EMAILS ?? '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export function allowedAuthDomains(): string[] {
  return (process.env.ALLOWED_AUTH_DOMAINS ?? 'bosscoderacademy.com')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export function isEmailAllowed(email: string | undefined | null): boolean {
  if (!email) return false;
  const domain = email.split('@')[1]?.toLowerCase();
  if (!domain) return false;
  return allowedAuthDomains().includes(domain);
}
