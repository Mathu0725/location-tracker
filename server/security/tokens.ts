import crypto from 'crypto';

/**
 * Generate a cryptographically secure, high-entropy URL-safe random token.
 * 32 bytes = 256 bits of entropy, safe against brute-force attacks.
 */
export function generateSecureToken(bytes: number = 32): string {
  return crypto.randomBytes(bytes).toString('base64url');
}

/**
 * Generate a clean prefixed ID for database rows.
 */
export function generateId(prefix: string): string {
  const randomPart = crypto.randomBytes(12).toString('hex');
  return `${prefix}_${randomPart}`;
}
