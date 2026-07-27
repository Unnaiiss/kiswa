import { adminAuth } from "@/lib/firebase/admin";

export const SESSION_COOKIE_NAME = "__session";
export const SESSION_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 5; // 5 days

export interface SessionClaims {
  uid: string;
  email: string | null;
  name: string | null;
  role: "admin" | "staff" | null;
}

/** Exchanges a fresh client ID token for a long-lived session cookie value. */
export async function createSessionCookie(idToken: string): Promise<string> {
  return adminAuth.createSessionCookie(idToken, {
    expiresIn: SESSION_MAX_AGE_MS,
  });
}

/** Verifies a session cookie value, checking Firebase's revocation list.
 * Returns null for any missing/expired/invalid/revoked cookie. */
export async function verifySessionCookie(
  cookieValue: string,
): Promise<SessionClaims | null> {
  try {
    const decoded = await adminAuth.verifySessionCookie(cookieValue, true);
    const role = (decoded as typeof decoded & { role?: string }).role;
    return {
      uid: decoded.uid,
      email: decoded.email ?? null,
      name: (decoded.name as string | undefined) ?? null,
      role: role === "admin" || role === "staff" ? role : null,
    };
  } catch {
    return null;
  }
}
