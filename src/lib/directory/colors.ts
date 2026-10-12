const AVATAR_COLORS = [
  '#0C447C', '#1D9E75', '#534AB7', '#993556',
  '#D85A30', '#BA7517', '#378ADD',
] as const;

export function colorForName(name: string): string {
  const sum = name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return AVATAR_COLORS[sum % AVATAR_COLORS.length];
}

/**
 * Department → colour. Matched by keyword so real names ("Website Tech",
 * "HR & Finance", "Corporate Relations") land on a colour instead of grey.
 * Order matters: the first matching rule wins.
 */
const DEPT_COLOR_RULES: Array<[RegExp, string]> = [
  [/\btech|engineer|developer|\bit\b|website/, '#3B82F6'],
  [/product/, '#06B6D4'],
  [/design|\bux\b|\bui\b|creative/, '#F43F5E'],
  [/\bhr\b|people|finance|account|talent|recruit/, '#EC4899'],
  [/growth|corporate|partnership|placement|relation/, '#10B981'],
  [/market|content|brand|social|seo/, '#F59E0B'],
  [/sales|business dev|admission|enrol|counsel/, '#8B5CF6'],
  [/oper|\bops\b|success|support|program|mentor/, '#F97316'],
];

export const NO_DEPT_COLOR = '#94A3B8';

export function deptColor(department: string | null | undefined): string {
  const d = (department ?? '').toLowerCase();
  if (!d) return NO_DEPT_COLOR;
  for (const [re, color] of DEPT_COLOR_RULES) if (re.test(d)) return color;
  return NO_DEPT_COLOR;
}
