import {
  type App,
  cert,
  getApps,
  initializeApp,
} from "firebase-admin/app";
import { type Auth, getAuth } from "firebase-admin/auth";
import { type Firestore, getFirestore } from "firebase-admin/firestore";

function loadServiceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!raw) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_KEY env var is not set");
  }
  return JSON.parse(raw);
}

// When pointed at the Firestore emulator (e.g. via `firebase emulators:exec`,
// which sets FIRESTORE_EMULATOR_HOST), no real credentials are needed.
const adminApp: App =
  getApps()[0] ??
  (process.env.FIRESTORE_EMULATOR_HOST
    ? initializeApp({ projectId: "kiswa-edda5" })
    : initializeApp({ credential: cert(loadServiceAccount()) }));

export const adminAuth: Auth = getAuth(adminApp);
export const adminDb: Firestore = getFirestore(adminApp);
