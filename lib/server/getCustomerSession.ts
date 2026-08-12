import { cache } from "react";
import { cookies } from "next/headers";
import {
  CUSTOMER_SESSION_COOKIE_NAME,
  verifyCustomerSessionCookie,
  type CustomerSessionClaims,
} from "./customerSessionCookie";

/** Request-memoized, same pattern as lib/server/getSession.ts (admin/staff)
 * but reading the separate __customer_session cookie. Never returns
 * anything for an admin/staff session cookie — they're different cookies
 * entirely, and verifyCustomerSessionCookie also rejects a role claim as
 * defense in depth. */
export const getCustomerSession = cache(
  async (): Promise<CustomerSessionClaims | null> => {
    const store = await cookies();
    const cookie = store.get(CUSTOMER_SESSION_COOKIE_NAME)?.value;
    if (!cookie) return null;
    return verifyCustomerSessionCookie(cookie);
  },
);
