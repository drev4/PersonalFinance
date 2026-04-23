/**
 * Sanitization helpers shared by middleware and repositories.
 *
 * These utilities defend against two common attack patterns:
 *
 * 1. **Prototype pollution / NoSQL injection** — attackers may send keys like
 *    `__proto__`, `constructor` or `prototype` in JSON bodies to try to mutate
 *    `Object.prototype` or inject Mongo operators. `sanitizeObject` strips
 *    those keys recursively.
 *
 * 2. **Unsafe `$regex` from user input** — Mongo's `$regex` treats its input
 *    as a pattern, so characters like `.`, `*`, `?`, `(` or `[` can alter
 *    matching behaviour or cause catastrophic backtracking. `escapeRegex`
 *    escapes every regex meta-character so the value matches literally.
 */

/** Matches regex meta-characters that must be escaped before use in `$regex`. */
const REGEX_META_CHARS = /[.*+?^${}()|[\]\\]/g;

/**
 * Escapes a user-supplied string so it can be safely used inside a Mongo
 * `$regex` query. The escaped value will match the exact substring, with no
 * special regex semantics.
 */
export function escapeRegex(str: string): string {
  return str.replace(REGEX_META_CHARS, '\\$&');
}

/** Keys that must never appear in user-supplied payloads. */
const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

/** Default string length cap — requests with longer strings are truncated. */
const DEFAULT_MAX_STRING_LENGTH = 10_000;

export interface SanitizeOptions {
  /** Maximum length allowed for any string value (defaults to 10_000). */
  maxStringLength?: number;
}

/**
 * Recursively removes dangerous keys from an object and truncates overly
 * long string values. Returns the same object reference (mutated in-place) —
 * callers that need a fresh copy should clone beforehand.
 *
 * Note: Mongo ObjectIds, Dates, Buffers and other class instances are left
 * untouched — only plain objects/arrays are traversed.
 */
export function sanitizeObject<T>(
  value: T,
  options: SanitizeOptions = {},
): T {
  const maxStringLength = options.maxStringLength ?? DEFAULT_MAX_STRING_LENGTH;
  sanitizeInPlace(value, maxStringLength, new WeakSet());
  return value;
}

/** Internal recursive worker. Uses a WeakSet to guard against cycles. */
function sanitizeInPlace(
  value: unknown,
  maxStringLength: number,
  seen: WeakSet<object>,
): void {
  if (value === null || value === undefined) return;

  if (typeof value === 'string') {
    // Strings can't be truncated in place — caller must swap the value.
    return;
  }

  if (Array.isArray(value)) {
    if (seen.has(value)) return;
    seen.add(value);
    for (let i = 0; i < value.length; i++) {
      const item = value[i];
      if (typeof item === 'string' && item.length > maxStringLength) {
        value[i] = item.slice(0, maxStringLength);
      } else if (typeof item === 'object' && item !== null) {
        sanitizeInPlace(item, maxStringLength, seen);
      }
    }
    return;
  }

  if (typeof value !== 'object') return;

  // Only traverse plain objects — skip class instances (Buffer, Date, ObjectId, …).
  const proto = Object.getPrototypeOf(value);
  if (proto !== Object.prototype && proto !== null) return;
  if (seen.has(value as object)) return;
  seen.add(value as object);

  const obj = value as Record<string, unknown>;
  for (const key of Object.keys(obj)) {
    if (FORBIDDEN_KEYS.has(key)) {
      delete obj[key];
      continue;
    }
    const child = obj[key];
    if (typeof child === 'string') {
      if (child.length > maxStringLength) {
        obj[key] = child.slice(0, maxStringLength);
      }
    } else if (typeof child === 'object' && child !== null) {
      sanitizeInPlace(child, maxStringLength, seen);
    }
  }
}
