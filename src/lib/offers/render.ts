import type { OfferData, TemplateKey } from '@/types/offer';

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

/** "2026-05-04" → "4 May 2026". Fallback returns the raw input on bad parse. */
export function formatDateLong(input: string): string {
  if (!input) return '';
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(input);
  if (!m) return input;
  const day = Number(m[3]);
  const monthIdx = Number(m[2]) - 1;
  const year = Number(m[1]);
  if (monthIdx < 0 || monthIdx > 11) return input;
  return `${day} ${MONTHS[monthIdx]} ${year}`;
}

/** Indian-locale number format: 1200000 → "12,00,000". */
export function formatINR(n: number): string {
  if (!Number.isFinite(n)) return '0';
  return Math.round(n).toLocaleString('en-IN');
}

/** Statutory PF cap: 12% of ₹15,000 basic = ₹1,800 / month for both employer + employee.
 *  Used as default — user can override per offer. */
export const DEFAULT_PF_MONTHLY = 1800;

/**
 * Auto-generates a Markdown salary breakdown table from the canonical inputs.
 * Renders as a real `<table>` once react-markdown processes it.
 *
 * Component split (matches the Google Doc templates):
 *   - Basic              50% of base monthly
 *   - HRA                25% of base monthly
 *   - Special Allowance  15% of base monthly
 *   - LTA                10% of base monthly
 *   - Base CTC           sum of the above (= base monthly)
 *   [if PF]
 *   - Employer's PF      ₹1,800 / month
 *   - Employee's PF      ₹1,800 / month
 *   [if variable AND PF — sales/ops style intermediate row]
 *   - Gross CTC          base + employer + employee
 *   [if variable]
 *   - Variable           variable / 12
 *   [always last when there's anything beyond Base CTC]
 *   - Total CTC          everything summed
 */
export function generateSalaryTableMarkdown(args: {
  annualBaseCtc: number;
  annualVariableCtc: number;
  includePf: boolean;
  pfAmountMonthly: number;
  /** Sales/Ops uses an explicit "Gross CTC" intermediate row when both PF + variable are on. */
  variant: 'sales-ops' | 'other-dept';
}): string {
  const { annualBaseCtc, annualVariableCtc, includePf, pfAmountMonthly, variant } = args;
  const baseM = annualBaseCtc / 12;
  const basicM = baseM * 0.5;
  const hraM = baseM * 0.25;
  const specialM = baseM * 0.15;
  const ltaM = baseM * 0.1;

  const pfM = includePf ? Math.max(0, pfAmountMonthly) : 0;
  const employerPfM = pfM;
  const employeePfM = pfM;
  const grossM = baseM + employerPfM + employeePfM;
  const variableM = annualVariableCtc / 12;
  const totalM = grossM + variableM;

  const fmt = (n: number) => `₹${formatINR(n)}`;
  const rows: string[] = [];
  rows.push('| Components | Monthly salary | Annual Salary |');
  rows.push('|---|---:|---:|');
  rows.push(`| Basic | ${fmt(basicM)} | ${fmt(basicM * 12)} |`);
  rows.push(`| HRA | ${fmt(hraM)} | ${fmt(hraM * 12)} |`);
  rows.push(`| Special Allowance | ${fmt(specialM)} | ${fmt(specialM * 12)} |`);
  rows.push(`| Leave Travel Allowance | ${fmt(ltaM)} | ${fmt(ltaM * 12)} |`);
  rows.push(`| **Base CTC** | **${fmt(baseM)}** | **${fmt(annualBaseCtc)}** |`);

  if (includePf) {
    rows.push(`| Employer's contribution to PF | ${fmt(employerPfM)} | ${fmt(employerPfM * 12)} |`);
    rows.push(`| Employee's contribution to PF | ${fmt(employeePfM)} | ${fmt(employeePfM * 12)} |`);
  }

  const hasVariable = annualVariableCtc > 0;
  if (variant === 'sales-ops' && includePf && hasVariable) {
    rows.push(`| **Gross CTC** | **${fmt(grossM)}** | **${fmt(grossM * 12)}** |`);
    rows.push(`| Variable | ${fmt(variableM)} | ${fmt(annualVariableCtc)} |`);
    rows.push(`| **Total CTC** | **${fmt(totalM)}** | **${fmt(totalM * 12)}** |`);
  } else if (hasVariable) {
    rows.push(`| Variable | ${fmt(variableM)} | ${fmt(annualVariableCtc)} |`);
    rows.push(`| **Total CTC** | **${fmt(baseM + variableM)}** | **${fmt(annualBaseCtc + annualVariableCtc)}** |`);
  } else if (includePf) {
    rows.push(`| **Total CTC** | **${fmt(grossM)}** | **${fmt(grossM * 12)}** |`);
  }
  // No PF, no variable: Base CTC IS the total — no extra row.

  return rows.join('\n');
}

/**
 * The data the templates can read. Wrap raw OfferData with derived fields like
 * pre-formatted dates and the auto-generated salary table.
 */
export function buildRenderContext(data: OfferData): Record<string, string | boolean> {
  const variant: 'sales-ops' | 'other-dept' =
    data.templateKey === 'sales-ops' ? 'sales-ops' : 'other-dept';

  const baseMonthly = data.annualBaseCtc / 12;

  return {
    // raw + display strings
    candidateName: data.candidateName,
    candidateEmail: data.candidateEmail,
    candidatePhone: data.candidatePhone,
    employmentType: data.employmentType,
    department: data.department,
    designation: data.designation,
    offerDate: formatDateLong(data.offerDate),
    joiningDate: formatDateLong(data.joiningDate),

    // compensation display
    baseCtcText: formatINR(data.annualBaseCtc),
    variableCtcText: formatINR(data.annualVariableCtc),
    baseMonthlyText: formatINR(baseMonthly),
    totalCtcText: formatINR(
      data.annualBaseCtc +
        (data.includePf ? (data.pfAmountMonthly || DEFAULT_PF_MONTHLY) * 2 * 12 : 0) +
        data.annualVariableCtc
    ),
    variableRateText: data.variableRateText,
    hasVariable: data.annualVariableCtc > 0,

    includePf: data.includePf,
    includeBstIncentives:
      data.includeBstIncentives && data.templateKey === 'sales-ops',

    // tenure
    probationMonths: String(data.probationMonths || 0),
    internshipDurationMonths: String(data.internshipDurationMonths || 0),

    // poc
    pocName: data.pocName,
    pocDesignation: data.pocDesignation,
    pocEmail: data.pocEmail,

    // the auto-table
    salaryTable:
      data.employmentType === 'internship'
        ? '' // intern letter doesn't have a salary table
        : generateSalaryTableMarkdown({
            annualBaseCtc: data.annualBaseCtc,
            annualVariableCtc: data.annualVariableCtc,
            includePf: data.includePf,
            pfAmountMonthly: data.pfAmountMonthly || DEFAULT_PF_MONTHLY,
            variant,
          }),
  };
}

/**
 
 * Tiny mustache-like template engine that handles:
 *   - `{{var}}`              — placeholder substitution
 *   - `{{#if var}} … {{/if}}` — conditional block (rendered when var is truthy)
 *
 * Conditionals are processed first (so substitutions inside the block work
 * normally on the surviving content). No nesting support — keep it simple.
 
 **/

export function renderTemplate(
  template: string,
  data: Record<string, string | boolean>
): string {
  // 1. Resolve conditionals.
  let out = template.replace(
    /\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g,
    (_match, key: string, body: string) => (truthy(data[key]) ? body : '')
  );
  // 2. Replace {{var}} placeholders.
  out = out.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => {
    const v = data[key];
    if (v === undefined || v === null) return '';
    return String(v);
  });
  return out;
}

function truthy(v: unknown): boolean {
  if (v === undefined || v === null) return false;
  if (typeof v === 'string') return v.trim().length > 0;
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number') return v > 0;
  return Boolean(v);
}

/** Re-export for convenience. */
export type { TemplateKey };
