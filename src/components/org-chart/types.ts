export type OrgPerson = {
  id: string;
  name: string;
  role: string;
  department: string;
  managerId: string | null;
  avatarUrl?: string;
};

export type OrgTreeNode = OrgPerson & {
  children: OrgTreeNode[];
  x: number;
  y: number;
  level: number;
};

export const NODE_W = 148;
export const NODE_H = 96;

export const DEPT_COLORS: Record<string, string> = {
  Engineering:  '#6366F1',
  Sales:        '#10B981',
  Marketing:    '#F59E0B',
  Product:      '#EC4899',
  Design:       '#8B5CF6',
  HR:           '#0C447C',
};
export const FALLBACK_COLOR = '#64748b';

export function deptColor(dept: string): string {
  return DEPT_COLORS[dept] ?? FALLBACK_COLOR;
}
