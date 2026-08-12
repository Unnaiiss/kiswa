import { adminAuth } from "@/lib/firebase/admin";

// Deliberately a different cookie name than lib/server/sessionCookie.ts's
// admin/staff SESSION_COOKIE_NAME — keeping these fully separate means a
// customer signing in on the same browser an admin/staff member last used
// (or vice versa) can never silently clobber the other's session, and a
// customer session cookie is structurally never even looked at by
// getSession()/the /admin and /pos gates.
export const CUSTOMER_SESSION_COOKIE_NAME = "__customer_session";
// Firebase session cookies cap out at 14 days (Admin SDK hard limit) — the
// longest "persistent across visits" this mechanism can actually provide in
// a single cookie. Still far longer than the 5-day admin/staff session.
export const CUSTOMER_SESSION_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 14;

export interface CustomerSessionClaims {
  uid: string;
  email: string | null;
  name: string | null;
}

/** Exchanges a fresh client ID token for a long-lived customer session
 * cookie value. Callers MUST have already verified (via verifyIdToken) that
 * this token carries no admin/staff role claim before calling this — see
 * app/api/account/session/route.ts and app/api/account/signup/route.ts. */
export async function createCustomerSessionCookie(idToken: string): Promise<string> {
  return adminAuth.createSessionCookie(idToken, {
    expiresIn: CUSTOMER_SESSION_MAX_AGE_MS,
  });
}

/** Verifies a customer session cookie value, checking Firebase's revocation
 * list. Returns null for any missing/expired/invalid/revoked cookie, AND —
 * defense in depth — for any cookie whose token carries an admin/staff role
 * claim (should never happen, since those are only ever minted by
 * lib/server/sessionCookie.ts under a different cookie name, but a customer
 * session must never be trusted to grant staff/admin-shaped access even in
 * the face of a future bug). */
export async function verifyCustomerSessionCookie(
  cookieValue: string,
): Promise<CustomerSessionClaims | null> {
  try {
    const decoded = await adminAuth.verifySessionCookie(cookieValue, true);
    const role = (decoded as typeof decoded & { role?: string }).role;
    if (role === "admin" || role === "staff") return null;
    return {
      uid: decoded.uid,
      email: decoded.email ?? null,
      name: (decoded.name as string | undefined) ?? null,
    };
  } catch {
    return null;
  }
}
