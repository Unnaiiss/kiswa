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

let cachedApp: App | undefined;

/**
 * Lazily creates (once) and returns the Admin SDK App. Deliberately NOT
 * called at module scope — see lazy() below for why: this must only ever
 * throw when something actually tries to reach Firebase, never as a side
 * effect of merely importing this file.
 */
function getAdminApp(): App {
  if (cachedApp) return cachedApp;
  cachedApp =
    getApps()[0] ??
    // When pointed at the Firestore emulator (e.g. via `firebase
    // emulators:exec`, which sets FIRESTORE_EMULATOR_HOST), no real
    // credentials are needed.
    (process.env.FIRESTORE_EMULATOR_HOST
      ? initializeApp({ projectId: "kiswa-edda5" })
      : initializeApp({ credential: cert(loadServiceAccount()) }));
  return cachedApp;
}

/**
 * Wraps a lazily-constructed instance behind a Proxy so it can still be
 * imported and used exactly like the real value everywhere (`adminDb.
 * collection(...)`, `adminAuth.verifyIdToken(...)`) with zero call-site
 * changes, while the actual construction (and any throw from missing
 * credentials) is deferred until the first real property access — which
 * happens inside whatever async function is calling it, so it can
 * actually be caught (see lib/store/queries.ts's safeRead()).
 *
 * This exists because of a real, reproduced bug: `adminDb`/`adminAuth`
 * used to be eagerly constructed at module-evaluation time. Next.js's
 * "Collecting page data" build step evaluates the top-level imports of
 * EVERY route/layout module (not just the ones a given request touches),
 * and lib/store/queries.ts (imported by the root layout and the (store)
 * layout — i.e. every single page, including the special ones like
 * /_not-found) imports this file transitively via lib/firestore/
 * admin-collections.ts. So a missing/misconfigured
 * FIREBASE_SERVICE_ACCOUNT_KEY (e.g. a typo'd Vercel env var) crashed the
 * ENTIRE build — not gracefully, not just one page — because the eager
 * `cert(loadServiceAccount())` call threw synchronously during a bare
 * `import`, which no try/catch anywhere downstream could ever catch (a
 * try/catch around an async function body cannot catch an exception
 * thrown while evaluating that function's own module dependencies).
 */
function lazy<T extends object>(factory: () => T): T {
  let instance: T | undefined;
  function ensure(): T {
    instance ??= factory();
    return instance;
  }
  return new Proxy({} as T, {
    get(_target, prop) {
      const real = ensure();
      const value = Reflect.get(real as object, prop, real);
      return typeof value === "function" ? value.bind(real) : value;
    },
    set(_target, prop, value) {
      return Reflect.set(ensure() as object, prop, value);
    },
    has(_target, prop) {
      return Reflect.has(ensure() as object, prop);
    },
    getPrototypeOf() {
      return Reflect.getPrototypeOf(ensure() as object);
    },
  });
}

export const adminAuth: Auth = lazy(() => getAuth(getAdminApp()));
export const adminDb: Firestore = lazy(() => getFirestore(getAdminApp()));
// Used by lib/server/imageStorage.ts, which needs the App instance itself
// to call firebase-admin/storage's getStorage(app) — same lazy contract.
export { getAdminApp };
