import { cache } from "react";
import { cookies } from "next/headers";
import {
  SESSION_COOKIE_NAME,
  verifySessionCookie,
  type SessionClaims,
} from "./sessionCookie";

/** Request-memoized: layout.tsx and page.tsx can both call this without
 * double-verifying the cookie (verifySessionCookie hits Firebase's revocation
 * check over the network, so dedup matters). */
export const getSession = cache(async (): Promise<SessionClaims | null> => {
  const store = await cookies();
  const cookie = store.get(SESSION_COOKIE_NAME)?.value;
  if (!cookie) return null;
  return verifySessionCookie(cookie);
});
