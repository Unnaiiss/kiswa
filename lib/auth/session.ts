"use client";

import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase/client";

export async function establishSession(idToken: string): Promise<void> {
  const res = await fetch("/api/auth/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken }),
  });
  if (!res.ok) {
    throw new Error("Could not establish session");
  }
}

export async function clearSession(): Promise<void> {
  await fetch("/api/auth/session", { method: "DELETE" }).catch(() => {});
}

/** Clears both the server session cookie and the client Firebase Auth SDK's
 * own persisted state — either alone would leave a half-signed-out user. */
export async function logout(): Promise<void> {
  await clearSession();
  await signOut(auth);
}
