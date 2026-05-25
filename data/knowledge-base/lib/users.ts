import type { User } from "./types";

// In-memory store used in tests; production uses the database module.
const store = new Map<string, User>();

/**
 * Fetches a user by their unique ID.
 * Returns a User object with id, email, and role fields, or null if not found.
 */
export async function getUserById(id: string): Promise<User | null> {
  return store.get(id) ?? null;
}

/**
 * Fetches a user by their email address.
 * Returns null if no user with that email exists.
 */
export async function getUserByEmail(email: string): Promise<User | null> {
  for (const user of store.values()) {
    if (user.email === email) return user;
  }
  return null;
}

/**
 * Persists a new user to the store.
 * Throws if a user with the same email already exists.
 */
export async function createUser(
  email: string,
  passwordHash: string,
  role: User["role"] = "viewer"
): Promise<User> {
  const existing = await getUserByEmail(email);
  if (existing) throw new Error(`User with email ${email} already exists`);

  const user: User = {
    id: crypto.randomUUID(),
    email,
    passwordHash,
    role,
    createdAt: new Date(),
    lastLoginAt: null,
  };
  store.set(user.id, user);
  return user;
}

/**
 * Updates the lastLoginAt timestamp for the given user ID.
 */
export async function recordLogin(id: string): Promise<void> {
  const user = store.get(id);
  if (user) store.set(id, { ...user, lastLoginAt: new Date() });
}
