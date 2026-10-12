import { isValidPhoneNumber, parsePhoneNumber } from 'libphonenumber-js/max';

/** Default country for numbers typed without a +country code. */
export const DEFAULT_PHONE_COUNTRY = 'IN' as const;

/**
 * A real mobile number (full metadata — the "min" build only checks length and would
 * accept e.g. 123456789). Landlines are rejected; numbers whose type can't be told
 * apart (e.g. US "FIXED_LINE_OR_MOBILE") are allowed.
 */
export function isValidMobile(value: string | null | undefined): boolean {
  if (!value || !isValidPhoneNumber(value, DEFAULT_PHONE_COUNTRY)) return false;
  const type = parsePhoneNumber(value, DEFAULT_PHONE_COUNTRY).getType();
  return type === 'MOBILE' || type === 'FIXED_LINE_OR_MOBILE' || type === undefined;
}

/** Stored value → E.164 ("+919876543210") for the phone input; '' if it can't be parsed. */
export function toE164(raw: string | null | undefined): string {
  if (!raw) return '';
  try {
    return parsePhoneNumber(raw, DEFAULT_PHONE_COUNTRY).number;
  } catch {
    return '';
  }
}

/** E.164 → readable international form ("+91 98765 43210") for display. */
export function formatPhone(raw: string | null | undefined): string {
  if (!raw) return '';
  try {
    return parsePhoneNumber(raw, DEFAULT_PHONE_COUNTRY).formatInternational();
  } catch {
    return raw;
  }
}
