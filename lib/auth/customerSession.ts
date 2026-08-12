"use client";

import { signInWithCustomToken, signOut } from "firebase/auth";
import { auth } from "@/lib/firebase/client";

/** AccountMenu (the header icon) fetches /api/account/me exactly once on
 * mount, so it has no way to learn about a login/logout that happens
 * elsewhere — e.g. the My Account page's own logout button, or a login
 * completed on a page where the header is a persistent layout component
 * that doesn't remount on client-side navigation. Every function in this
 * file that changes the session dispatches this so any mounted AccountMenu
 * re-checks itself. */
export const CUSTOMER_AUTH_CHANGED_EVENT = "kiswa:customer-auth-changed";

function notifyAuthChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(CUSTOMER_AUTH_CHANGED_EVENT));
  }
}

/** Mints the server-verified __customer_session cookie from a fresh client
 * ID token — same pattern as lib/auth/session.ts's establishSession, but
 * hitting the separate customer-only route. The server independently
 * re-verifies the token and checks it carries no admin/staff claim before
 * creating anything (see app/api/account/session/route.ts) — this call
 * alone grants nothing. */
export async function establishCustomerSession(idToken: string): Promise<void> {
  const res = await fetch("/api/account/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error ?? "Could not sign you in. Please try again.");
  }
  notifyAuthChanged();
}

/** Creates the Firebase Auth user server-side (see
 * app/api/account/signup/route.ts — the only way the password policy is
 * genuinely enforced rather than just suggested), then signs the browser's
 * Firebase SDK in via the returned custom token, then establishes the
 * session cookie the same way login does. Never calls
 * createUserWithEmailAndPassword client-side — the server must be the one
 * to see and validate the raw password. */
export async function signupCustomer(data: {
  email: string;
  password: string;
  name: string;
  phone: string | null;
  marketingOptIn: boolean;
}): Promise<void> {
  const res = await fetch("/api/account/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body.error ?? "Could not create your account. Please try again.");
  }

  const credential = await signInWithCustomToken(auth, body.customToken);
  const idToken = await credential.user.getIdToken();
  await establishCustomerSession(idToken); // also notifies
}

export async function clearCustomerSession(): Promise<void> {
  await fetch("/api/account/session", { method: "DELETE" }).catch(() => {});
  notifyAuthChanged();
}

/** Clears both the server session cookie and the client Firebase Auth SDK's
 * own persisted state — either alone would leave a half-signed-out user
 * (same reasoning as lib/auth/session.ts's admin/staff logout). */
export async function customerLogout(): Promise<void> {
  await clearCustomerSession(); // also notifies
  await signOut(auth);
}
