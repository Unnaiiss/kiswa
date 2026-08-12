import { FieldValue } from "firebase-admin/firestore";
import { customersCollection } from "@/lib/firestore/admin-collections";
import type { CustomerDoc } from "@/lib/firestore/types";

/** Used by /account (My Account) to render the current profile.
 * Server-only — reads via firebase-admin, not the customer's own limited
 * Firestore rule (which exists for potential future direct-SDK use, not
 * this page). Returns null if somehow called for a uid with no doc yet
 * (shouldn't happen once signed in, since login/signup always create one). */
export async function getCustomerProfile(uid: string): Promise<CustomerDoc | null> {
  const snap = await customersCollection().doc(uid).get();
  return snap.data() ?? null;
}

/** Used by /api/account/session (email/password login AND Google sign-in —
 * both arrive here with an already-authenticated Firebase user and no
 * separate "signup form" data). Creates the customers/{uid} doc on first
 * sign-in of any kind (a Google user may never have gone through the
 * dedicated signup form at all), otherwise just touches lastLoginAt —
 * deliberately never clobbers name/phone/marketingOptIn a returning
 * customer may have edited via their profile. */
export async function touchCustomerOnLogin(params: {
  uid: string;
  email: string | null;
  displayName: string | null;
}): Promise<void> {
  const ref = customersCollection().doc(params.uid);
  const snap = await ref.get();
  if (!snap.exists) {
    await ref.set({
      name: params.displayName ?? null,
      email: params.email ?? "",
      phone: null,
      createdAt: FieldValue.serverTimestamp(),
      lastLoginAt: FieldValue.serverTimestamp(),
      marketingOptIn: false,
    });
    return;
  }
  await ref.set({ lastLoginAt: FieldValue.serverTimestamp() }, { merge: true });
}

/** Used by /api/account/signup — the dedicated signup form, which collects
 * name/phone/marketingOptIn explicitly. Idempotent (safe to call twice for
 * the same uid, e.g. a double-submitted request) via set+merge. */
export async function createCustomerOnSignup(params: {
  uid: string;
  email: string | null;
  name: string;
  phone: string | null;
  marketingOptIn: boolean;
}): Promise<void> {
  const ref = customersCollection().doc(params.uid);
  const snap = await ref.get();
  await ref.set(
    {
      name: params.name,
      email: params.email ?? "",
      phone: params.phone,
      marketingOptIn: params.marketingOptIn,
      lastLoginAt: FieldValue.serverTimestamp(),
      ...(snap.exists ? {} : { createdAt: FieldValue.serverTimestamp() }),
    },
    { merge: true },
  );
}
