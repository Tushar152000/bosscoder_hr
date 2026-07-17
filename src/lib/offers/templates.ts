import type { TemplateKey } from '@/types/offer';

/**
 * Department → template mapping per the spec:
 *  - "sales-ops": Sales (BCA, DSML, BST, Operations) + Operations.
 *  - "other-dept": Video editor / Graphic designer / Marketing / HR / Finance / Product / Tech.
 *
 * Anything not listed defaults to "other-dept".
 */
export function templateKeyForDepartment(department: string): TemplateKey {
  const d = department.toLowerCase();
  if (d.startsWith('sales') || d.startsWith('operations')) return 'sales-ops';
  return 'other-dept';
}

/**
 * Template bodies — verbatim text from the Bosscoder Academy offer letter
 * Google Docs, with `{{placeholders}}` for dynamic fields and `{{salaryTable}}`
 * for the auto-computed compensation breakdown.
 *
 * Template engine syntax (see lib/offers/render.ts):
 *   - `{{var}}`               placeholder substitution
 *   - `{{#if var}} … {{/if}}` conditional block (rendered when var is truthy)
 *
 * Every letter is fully editable — these are starting points.
 */
export const TEMPLATE_BODIES: Record<TemplateKey, string> = {
  // ─── Sales / Operations format ─────────────────────────────────────────────
  
'sales-ops': `**{{offerDate}}**

Dear **{{candidateName}}**,

We would like to congratulate you on being selected for a full-time role of **{{designation}}** at **Bosscoder Software Services Pvt. Ltd.** This would be a full-time position working with our sales team to support their development strategies. Duties would include communication with working professionals & students, Bosscoder team members to create processes and handle the operations of the company. You would be paid **Rs. {{baseMonthlyText}}/-** as base pay{{#if variableRateText}} + **{{variableRateText}}**{{/if}}. Your annual CTC is **Rs. {{baseCtcText}}/-** base{{#if hasVariable}} and **Rs. {{variableCtcText}}/-** variable{{/if}}. Kindly find the final breakdown in Annexure A.

You will be on probation for a period of **{{probationMonths}} months**. You shall start effectively as a full-time employee from **{{joiningDate}}**.

Any employee, officer, or personnel appointed by Bosscoder Software Services Private Limited ("the Company") may, subject to the requirements of business and at the discretion of the Company, be deployed, seconded, assigned, or transferred to Bosscoder School of Technology Private Limited or to any holding company, subsidiary company, associate company, fellow subsidiary, or other affiliated entity of the Company, whether existing now or in the future, within or outside India.

For the purposes of this clause, the expressions "holding company", "subsidiary company", and "associate company" shall have the meanings respectively assigned to them under the provisions of the Companies Act, 2013 and the rules made thereunder.

Such deployment shall be deemed to be in the ordinary course of employment with the Company and shall not constitute a change of employer, unless otherwise expressly agreed in writing.

**Notice Period**

- You will be required to serve a notice period of minimum one (1) week if you decide to resign from your position during the probation period.
- After successful completion of the probation period, a minimum of one (1) month's notice is mandatory. During this period, you must ensure a smooth transition of your responsibilities.
- The company may terminate your employment with or without cause by providing one week's written notice or paying you one week's gross salary in lieu of notice.
- If you resign, you must submit your resignation and obtain clearance from the designated officials before leaving. Failing to do so will result in no salary being paid for the notice period.

**Employment Bond**

- By accepting this offer, you acknowledge that a minimum commitment of one year with Bosscoder Software Services Pvt. Ltd. is required, as per the terms of employment.

**Annexure - A**

**Salary Structure**

{{salaryTable}}

Please ensure the submission of the following electronic documents upon joining:

1. Highest Education Certificates
2. Relieving Letter or Experience Letter from the Immediate Previous Employer
3. PAN Card
4. Aadhaar Card
5. Cancelled Cheque / Bank Passbook

For any queries, you may reach out to **{{pocName}}** ({{pocDesignation}}) - {{pocEmail}}

We are excited to have you as part of Bosscoder Software Services Pvt. Ltd. and look forward to achieving great milestones together! Welcome aboard!

Sincerely,

**Rajat Kumar Garg**

Authorised Signatory

I Agree,

\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_

Name, Signature & Date{{#if includeBstIncentives}}

---

**Performance-Based Incentives**

In addition to the fixed compensation, you will be eligible for performance-based incentives linked to the number of registrations. The incentive payout will be governed by the following structure:

- For less than 50 registrations, the incentive will be calculated at **₹100 per registration**.
- For **50 to 69 registrations**, a fixed incentive of **₹7,000** will be payable.
- For **70 to 99 registrations**, a fixed incentive of **₹10,000** will be payable.
- For **100 registrations**, a fixed incentive of **₹12,000** will be payable.
- For registrations exceeding 100, a fixed incentive of **₹12,000** will be payable for the first 100 registrations, and any additional registrations beyond 100 will be incentivized at **₹150 per additional registration**.{{/if}}`,

  // ─── Other departments format ──────────────────────────────────────────────
  'other-dept': `**{{offerDate}}**

Dear **{{candidateName}}**,

We would like to congratulate you on being selected for a full-time role of **{{designation}}** at **Bosscoder Software Services Pvt. Ltd.** You would be paid **Rs. {{baseMonthlyText}}/-** as base pay. Your annual CTC is **Rs. {{baseCtcText}}/-** as base pay. Kindly find the final breakdown in Annexure A. You shall start effectively as a full time employee from **{{joiningDate}}**. You'll be in probation period for **{{probationMonths}} months**.

**Notice Period**

- You will be required to serve a notice period of 1 month if you decide to resign from your position after the probation period. During this period, you must ensure a smooth transition of your responsibilities.
- If you choose to leave during the probation period, the company shall not be liable to pay you any salary for that month. However, if the company decides to discontinue your services at any time during your probation, you shall be paid salary up to the date of termination.
- The company may terminate your employment with or without cause by providing one week's written notice or paying you one week's gross salary in lieu of notice.
- If you resign, you must submit your resignation and obtain clearance from the designated officials before leaving. Failing to do so will result in no salary being paid for the notice period.

**Employment Bond**

- By accepting this offer, you acknowledge that a minimum commitment of one year with Bosscoder Software Services Pvt. Ltd. is required, as per the terms of employment.

**Annexure - A**

**Salary Structure**

{{salaryTable}}

**Documents Required on the Date of Joining:**

1. Highest Education Certificates
2. Relieving Letter or Experience Letter from the Immediate Previous Employer
3. PAN Card
4. Aadhaar Card
5. Cancelled Cheque / Bank Passbook

For any queries, you may reach out to **{{pocName}}** ({{pocDesignation}}) - {{pocEmail}}

We are excited to have you as part of Bosscoder Software Services Pvt. Ltd. and look forward to achieving great milestones together! Welcome aboard!

Sincerely,

**Rajat Kumar Garg**

Authorised Signatory

I Agree,

\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_

Name, Signature & Date`,

  // ─── Internship format ─────────────────────────────────────────────────────
  intern: `**{{offerDate}}**

Dear **{{candidateName}}**,

We are excited to welcome you to **Bosscoder Software Services Pvt Ltd. ('Bosscoder Academy')** for the role of **{{designation}}**. We believe that our team is our biggest strength and together we can make an impact. We take great pride in hiring hardworking talents.

**Perks and Benefits**

1. **Rs. {{baseMonthlyText}} per month**
2. Letter of Recommendation
3. Opportunity to get an offer extended

**Duration:** {{internshipDurationMonths}} Months

**Joining Date:** {{joiningDate}}

If you decide to accept this offer, please sign it electronically and return it to us. The elements of this offer are personal and specific to you and we do not consider them appropriate to be shared with colleagues or the general public.

We look forward to you joining Bosscoder Academy and helping us (and you!) continue to grow and prosper in the future.

Sincerely,

**Rajat Kumar Garg**

Authorised Signatory

I Agree,

\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_

Name, Signature & Date`,

  // ─── Relieving letter ───────────────────────────────────────────────────────
  relieving: `**{{offerDate}}**

## RELIEVING LETTER

Dear **{{candidateName}}**,

With reference to your resignation email dated **{{resignationDate}}**, you are hereby relieved from your duties as on **{{relievingDate}}**. We confirm that you have been working with **Bosscoder Software Services Pvt. Ltd.**, as **{{designation}}** from **{{joiningDate}}** to **{{lastWorkingDate}}**.

We would like to thank you for your service with Bosscoder Software Services Pvt. Ltd. & wish you the best wishes.

We wish you all the best in your future endeavors.

Yours Sincerely,

For **Bosscoder Academy**

**Rajat Garg**

Co-Founder`,

  // ─── Experience letter ──────────────────────────────────────────────────────
  experience: `**{{offerDate}}**

## TO WHOM IT MAY CONCERN

To whomsoever it may concern, this is to certify that **{{candidateName}}** was employed as **{{designation}}** in the **{{department}}** Department from **{{joiningDate}}** to **{{lastWorkingDate}}**.

Throughout their tenure, they have diligently fulfilled their responsibilities as **{{designation}}** and we appreciate the positive impact they have made. They have worked under the guidance of **Rajat Garg**.

We extend our heartfelt appreciation for their hard work and commitment during their time with us. We wish them all the best in their future endeavors and trust that they will excel in their next role.

Yours Sincerely

**Rajat Garg**

(Co-Founder)`,
};

export function defaultBodyFor(templateKey: TemplateKey): string {
  return TEMPLATE_BODIES[templateKey];
}
