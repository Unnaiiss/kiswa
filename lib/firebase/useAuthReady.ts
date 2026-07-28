"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./client";

/**
 * True once Firebase Auth has restored (or confirmed there is no) persisted
 * session. `auth.currentUser` is null synchronously on first load even for an
 * already-logged-in user — the SDK restores it from IndexedDB asynchronously.
 * Admin/POS Firestore listeners that require the signed-in user's custom
 * claims must wait for this before subscribing, otherwise the very first
 * listen attempt races that restore and fires a spurious permission-denied.
 */
export function useAuthReady(): boolean {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    return onAuthStateChanged(auth, () => setReady(true));
  }, []);

  return ready;
}
