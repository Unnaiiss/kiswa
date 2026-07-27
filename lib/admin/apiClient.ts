"use client";

import { auth } from "@/lib/firebase/client";

/** Fetch wrapper that attaches the signed-in admin's Firebase ID token and
 * throws a plain Error with the API's {error} message on failure. */
export async function adminFetch<T = unknown>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const idToken = await auth.currentUser?.getIdToken();
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");
  if (idToken) headers.set("Authorization", `Bearer ${idToken}`);

  const res = await fetch(path, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error ?? "Request failed");
  }
  return data as T;
}
