import { isValidMobile } from '@/lib/phone';
import type { AddressFields } from '@/types/employee';
import type { OnboardingAnswers } from '@/types/onboarding';

/** Used on the joiner's form and again on the server when they submit. */

export type OnboardingStep = 'personal' | 'family' | 'address' | 'identity' | 'previous';

export const ONBOARDING_STEPS: { id: OnboardingStep; label: string }[] = [
  { id: 'personal', label: 'About you' },
  { id: 'family', label: 'Family & emergency' },
  { id: 'address', label: 'Address' },
  { id: 'identity', label: 'ID documents' },
  { id: 'previous', label: 'Previous job' },
];

export const PAN_RE = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
export const AADHAAR_RE = /^\d{12}$/;
export const UAN_RE = /^\d{12}$/;
const PINCODE_RE = /^\d{6}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const blank = (v: string | null | undefined) => !v || !v.trim();

function addressErrors(a: AddressFields, prefix: string): Record<string, string> {
  const e: Record<string, string> = {};
  if (blank(a.line1)) e[`${prefix}.line1`] = 'Enter house / flat and street';
  if (blank(a.city)) e[`${prefix}.city`] = 'Enter the city';
  if (blank(a.state)) e[`${prefix}.state`] = 'Enter the state';
  if (blank(a.pincode)) e[`${prefix}.pincode`] = 'Enter the pincode';
  else if (!PINCODE_RE.test(a.pincode!.trim())) e[`${prefix}.pincode`] = 'Pincode is 6 digits';
  return e;
}

function phoneError(v: string | null): string | null {
  if (blank(v)) return 'Enter a mobile number';
  return isValidMobile(v) ? null : 'Enter a valid mobile number';
}

/**
 * Problems with one step, keyed by field path. `docs` says which ID pictures are
 * uploaded. An empty object means the step is complete.
 */
export function stepErrors(
  step: OnboardingStep,
  a: OnboardingAnswers,
  docs: { aadhaar: boolean; pan: boolean },
): Record<string, string> {
  const e: Record<string, string> = {};
  const put = (k: string, msg: string | null) => { if (msg) e[k] = msg; };

  if (step === 'personal') {
    put('phone', phoneError(a.phone));
    if (blank(a.personalEmail)) e.personalEmail = 'Enter your personal email';
    else if (!EMAIL_RE.test(a.personalEmail!.trim())) e.personalEmail = 'Enter a valid email';
    if (blank(a.dob)) e.dob = 'Enter your date of birth';
  }

  if (step === 'family') {
    if (blank(a.family.fatherName)) e['family.fatherName'] = "Enter your father's name";
    put('family.fatherPhone', phoneError(a.family.fatherPhone));
    if (blank(a.family.motherName)) e['family.motherName'] = "Enter your mother's name";
    put('family.motherPhone', phoneError(a.family.motherPhone));
    if (blank(a.emergencyContact.name)) e['emergencyContact.name'] = 'Enter a name';
    put('emergencyContact.phone', phoneError(a.emergencyContact.phone));
    if (blank(a.emergencyContact.relation)) e['emergencyContact.relation'] = 'How are they related to you?';
  }

  if (step === 'address') {
    Object.assign(e, addressErrors(a.address, 'address'));
    if (!a.permanentSame) Object.assign(e, addressErrors(a.permanentAddress, 'permanentAddress'));
  }

  if (step === 'identity') {
    if (blank(a.pan)) e.pan = 'Enter your PAN';
    else if (!PAN_RE.test(a.pan!.trim().toUpperCase())) e.pan = 'PAN looks like ABCDE1234F';
    if (blank(a.aadhaar)) e.aadhaar = 'Enter your Aadhaar number';
    else if (!AADHAAR_RE.test(a.aadhaar!.replace(/\s/g, ''))) e.aadhaar = 'Aadhaar is 12 digits';
    if (!a.noUan) {
      if (blank(a.uan)) e.uan = "Enter your UAN, or tick that you don't have one";
      else if (!UAN_RE.test(a.uan!.replace(/\s/g, ''))) e.uan = 'UAN is 12 digits';
    }
    if (!docs.pan) e['doc.pan'] = 'Upload a photo of your PAN card';
    if (!docs.aadhaar) e['doc.aadhaar'] = 'Upload a photo of your Aadhaar card';
  }

  if (step === 'previous' && !a.firstJob) {
    const p = a.previousEmployment;
    if (blank(p.company)) e['previousEmployment.company'] = 'Enter the company name';
    if (blank(p.managerName)) e['previousEmployment.managerName'] = "Enter your manager's name";
    put('previousEmployment.managerPhone', phoneError(p.managerPhone));
    if (blank(p.managerEmail)) e['previousEmployment.managerEmail'] = "Enter your manager's email";
    else if (!EMAIL_RE.test(p.managerEmail!.trim())) e['previousEmployment.managerEmail'] = 'Enter a valid email';
  }

  return e;
}

/** All steps' problems together — empty means the form can be submitted. */
export function allErrors(a: OnboardingAnswers, docs: { aadhaar: boolean; pan: boolean }): Record<string, string> {
  return Object.assign({}, ...ONBOARDING_STEPS.map((s) => stepErrors(s.id, a, docs)));
}

/** Share of steps complete, 0–100 — for HR's list. */
export function completionPercent(a: OnboardingAnswers, docs: { aadhaar: boolean; pan: boolean }): number {
  const done = ONBOARDING_STEPS.filter((s) => Object.keys(stepErrors(s.id, a, docs)).length === 0).length;
  return Math.round((done / ONBOARDING_STEPS.length) * 100);
}

/** Tidy what the joiner typed before it's stored. */
export function normalizeAnswers(a: OnboardingAnswers): OnboardingAnswers {
  const t = (v: string | null) => (v && v.trim() ? v.trim() : null);
  const addr = (x: AddressFields): AddressFields => ({
    line1: t(x.line1), line2: t(x.line2), city: t(x.city), state: t(x.state), pincode: t(x.pincode),
  });
  return {
    phone: t(a.phone),
    personalEmail: t(a.personalEmail)?.toLowerCase() ?? null,
    dob: t(a.dob),
    family: {
      fatherName: t(a.family.fatherName),
      fatherPhone: t(a.family.fatherPhone),
      motherName: t(a.family.motherName),
      motherPhone: t(a.family.motherPhone),
    },
    emergencyContact: {
      name: t(a.emergencyContact.name),
      phone: t(a.emergencyContact.phone),
      relation: t(a.emergencyContact.relation),
    },
    address: addr(a.address),
    permanentSame: !!a.permanentSame,
    permanentAddress: addr(a.permanentAddress),
    pan: t(a.pan)?.toUpperCase() ?? null,
    aadhaar: t(a.aadhaar)?.replace(/\s/g, '') ?? null,
    uan: a.noUan ? null : (t(a.uan)?.replace(/\s/g, '') ?? null),
    noUan: !!a.noUan,
    firstJob: !!a.firstJob,
    previousEmployment: a.firstJob
      ? { company: null, managerName: null, managerPhone: null, managerEmail: null }
      : {
          company: t(a.previousEmployment.company),
          managerName: t(a.previousEmployment.managerName),
          managerPhone: t(a.previousEmployment.managerPhone),
          managerEmail: t(a.previousEmployment.managerEmail)?.toLowerCase() ?? null,
        },
  };
}
