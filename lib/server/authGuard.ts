import { adminAuth } from "@/lib/firebase/admin";

export class AuthError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

/**
 * Verifies the Firebase ID token in the Authorization header and checks the
 * caller's custom-claim role is one of `allowedRoles`. Throws AuthError
 * (401/403) otherwise — callers should catch and translate to a JSON response.
 */
export async function requireRole(request: Request, allowedRoles: string[]) {
  const authHeader = request.headers.get("authorization") ?? "";
  const idToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!idToken) {
    throw new AuthError("Missing authorization", 401);
  }

  let decoded;
  try {
    decoded = await adminAuth.verifyIdToken(idToken);
  } catch {
    throw new AuthError("Invalid or expired session. Please sign in again.", 401);
  }

  const role = (decoded as typeof decoded & { role?: string }).role;
  if (!role || !allowedRoles.includes(role)) {
    throw new AuthError("Not authorized", 403);
  }

  return decoded;
}
