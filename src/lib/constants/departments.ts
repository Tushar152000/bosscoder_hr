/**
 * Canonical department list. Matches the org structure used for review
 * assignments. To add a new department, append here — existing employees
 * keep working since `department` is still a free-text string in storage,
 * but the UI uses this list for selection and access scoping.
 */
export const DEPARTMENTS = [
  'HR & Finance',
  'Sales SDE',
  'Sales DSML',
  'Sales BST',
  'Sales Operations',
  'Product',
  'Operations - SDE',
  'Operations - DSML',
  'Video Editors',
  'Graphic Designers',
  'Performance Marketing',
  'Organic and Influencer Marketing',
  'Website Tech',
  'Product Tech',
] as const;

export type Department = (typeof DEPARTMENTS)[number];

export function isDepartment(value: string): value is Department {
  return (DEPARTMENTS as readonly string[]).includes(value);
}
