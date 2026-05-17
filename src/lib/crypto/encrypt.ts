import 'server-only';
import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  type CipherGCM,
  type DecipherGCM,
} from 'node:crypto';

/**
 * Field-level encryption.
 *
 * Local dev: AES-256-GCM with a 32-byte key from HR_ENCRYPTION_KEY (base64).
 * Production: same on-disk format, but the key is unwrapped from Cloud KMS
 * via envelope encryption — swap `getKey()` to fetch the DEK from KMS.
 *
 * Stored shape (Firestore):
 *   { v: 1, iv: <base64>, ct: <base64>, tag: <base64> }
 *
 * NEVER write plaintext for fields listed in `lib/crypto/fields.ts`.
 */

export const ENCRYPTION_VERSION = 1;
const ALGO = 'aes-256-gcm';
const IV_BYTES = 12;

export interface EncryptedField {
  v: number;
  iv: string;
  ct: string;
  tag: string;
}

let cachedKey: Buffer | null = null;
function getKey(): Buffer {
  if (cachedKey) return cachedKey;
  const raw = process.env.HR_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error(
      'HR_ENCRYPTION_KEY is not set. Generate one: ' +
        'node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'base64\'))"'
    );
  }
  const buf = Buffer.from(raw, 'base64');
  if (buf.length !== 32) {
    throw new Error(`HR_ENCRYPTION_KEY must decode to 32 bytes (got ${buf.length}).`);
  }
  cachedKey = buf;
  return buf;
}

export function encryptString(plaintext: string): EncryptedField {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGO, getKey(), iv) as CipherGCM;
  const ct = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    v: ENCRYPTION_VERSION,
    iv: iv.toString('base64'),
    ct: ct.toString('base64'),
    tag: tag.toString('base64'),
  };
}

export function decryptString(payload: EncryptedField): string {
  if (payload.v !== ENCRYPTION_VERSION) {
    throw new Error(`Unsupported encrypted payload version: ${payload.v}`);
  }
  const iv = Buffer.from(payload.iv, 'base64');
  const ct = Buffer.from(payload.ct, 'base64');
  const tag = Buffer.from(payload.tag, 'base64');
  const decipher = createDecipheriv(ALGO, getKey(), iv) as DecipherGCM;
  decipher.setAuthTag(tag);
  const pt = Buffer.concat([decipher.update(ct), decipher.final()]);
  return pt.toString('utf8');
}

export function isEncryptedField(value: unknown): value is EncryptedField {
  return (
    !!value &&
    typeof value === 'object' &&
    'v' in value &&
    'iv' in value &&
    'ct' in value &&
    'tag' in value
  );
}

export function encryptOptional(value: string | null | undefined): EncryptedField | null {
  if (value == null || value === '') return null;
  return encryptString(value);
}

export function decryptOptional(value: EncryptedField | null | undefined): string | null {
  if (value == null) return null;
  return decryptString(value);
}
