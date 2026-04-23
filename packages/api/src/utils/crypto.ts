import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto';
import env from '../config/env.js';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

function getKeyBuffer(): Buffer {
  return Buffer.from(env.ENCRYPTION_KEY, 'hex');
}

export function encrypt(text: string): { encryptedData: string; iv: string } {
  const key = getKeyBuffer();
  const iv = randomBytes(IV_LENGTH);

  const cipher = createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([
    cipher.update(text, 'utf8'),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();

  // Combine encrypted data and auth tag for storage
  const combined = Buffer.concat([encrypted, authTag]);

  return {
    encryptedData: combined.toString('hex'),
    iv: iv.toString('hex'),
  };
}

export function decrypt(encryptedData: string, iv: string): string {
  const key = getKeyBuffer();
  const ivBuffer = Buffer.from(iv, 'hex');
  const combined = Buffer.from(encryptedData, 'hex');

  // Split auth tag from encrypted data
  const authTag = combined.subarray(combined.length - AUTH_TAG_LENGTH);
  const encrypted = combined.subarray(0, combined.length - AUTH_TAG_LENGTH);

  const decipher = createDecipheriv(ALGORITHM, key, ivBuffer);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);

  return decrypted.toString('utf8');
}

/**
 * Compares two strings in constant time to prevent timing attacks.
 *
 * Using `===` on secrets (tokens, hashes, HMACs) leaks information about how
 * many leading characters match via wall-clock time. `timingSafeEqual` always
 * compares every byte, eliminating that side channel.
 *
 * Returns `false` immediately if the byte lengths differ (mismatched lengths
 * can never be equal anyway, and `timingSafeEqual` throws on mismatched lengths).
 */
export function safeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}
