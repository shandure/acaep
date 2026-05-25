import { validateCredentials, issueToken } from "../../../../lib/auth";

/**
 * POST /api/auth/login
 *
 * Authenticates a user with email and password.
 * On success: issues a signed JWT stored in an HttpOnly cookie and returns 200.
 * On failure: returns 401 with an error message.
 *
 * Full login flow:
 *   1. Parse email + password from request body
 *   2. Call validateCredentials → checks DB hash via bcrypt
 *   3. Call generateJWT → signs a token with userId and role
 *   4. Set token in HttpOnly cookie (not accessible to JS — XSS protection)
 *   5. Return { success: true }
 */
export async function POST(req: Request): Promise<Response> {
  let body: { email?: string; password?: string };

  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { email, password } = body;
  if (!email || !password) {
    return Response.json({ error: "email and password are required" }, { status: 400 });
  }

  const user = await validateCredentials(email, password);
  if (!user) {
    return Response.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const token = issueToken(user);

  const response = Response.json({ success: true, role: user.role });
  response.headers.set(
    "Set-Cookie",
    `token=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=28800`
  );

  return response;
}

/**
 * DELETE /api/auth/login
 *
 * Logs the user out by clearing the HttpOnly cookie.
 */
export async function DELETE(): Promise<Response> {
  const response = Response.json({ success: true });
  response.headers.set("Set-Cookie", "token=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0");
  return response;
}
