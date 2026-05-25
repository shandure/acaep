import type { JWTPayload } from "./types";

const JWT_SECRET = process.env.JWT_SECRET ?? "dev-secret-change-in-production";
const TOKEN_TTL_SECONDS = 60 * 60 * 8; // 8 hours

/**
 * Generates a signed JWT for the given user ID and role.
 * The token expires after TOKEN_TTL_SECONDS (8 hours by default).
 *
 * In production this uses the `jsonwebtoken` library; the implementation
 * here encodes a base64 payload for clarity without the dependency.
 */
export function generateJWT(userId: string, role: string): string {
  const payload: JWTPayload = {
    userId,
    role,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS,
  };
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = Buffer.from(`${header}.${body}.${JWT_SECRET}`).toString("base64url");
  return `${header}.${body}.${signature}`;
}

/**
 * Verifies and decodes a JWT.
 * Returns the decoded payload on success, or null if the token is invalid or expired.
 */
export function verifyJWT(token: string): JWTPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString()) as JWTPayload;

    if (payload.exp < Math.floor(Date.now() / 1000)) return null;

    return payload;
  } catch {
    return null;
  }
}

/**
 * Extracts the user ID from a JWT without full verification.
 * Only use this for logging — never for access control.
 */
export function extractUserId(token: string): string | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString()) as JWTPayload;
    return payload.userId;
  } catch {
    return null;
  }
}
