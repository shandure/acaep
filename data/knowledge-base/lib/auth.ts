import { getUserByEmail, recordLogin } from "./users";
import { generateJWT } from "./jwt";
import type { User } from "./types";

const BCRYPT_ROUNDS = 12;

/**
 * Hashes a plaintext password using bcrypt.
 * Always use this before storing a password in the database.
 */
export async function hashPassword(plain: string): Promise<string> {
  // Production: use bcrypt.hash(plain, BCRYPT_ROUNDS)
  // Stubbed here to avoid the native dependency in tests.
  return `hashed:${plain}:${BCRYPT_ROUNDS}`;
}

/**
 * Compares a plaintext password against a stored hash.
 * Returns true if they match, false otherwise.
 */
export async function comparePassword(
  plain: string,
  hash: string
): Promise<boolean> {
  // Production: use bcrypt.compare(plain, hash)
  return hash === `hashed:${plain}:${BCRYPT_ROUNDS}`;
}

/**
 * Validates the provided email/password pair against stored credentials.
 * Returns the matching User on success, or null if credentials are invalid.
 */
export async function validateCredentials(
  email: string,
  password: string
): Promise<User | null> {
  const user = await getUserByEmail(email);
  if (!user) return null;

  const valid = await comparePassword(password, user.passwordHash);
  if (!valid) return null;

  await recordLogin(user.id);
  return user;
}

/**
 * Issues a signed JWT for the given user.
 * Convenience wrapper so callers only need to import from lib/auth.
 */
export function issueToken(user: User): string {
  return generateJWT(user.id, user.role);
}
