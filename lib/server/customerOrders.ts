import { salesCollection } from "@/lib/firestore/admin-collections";
import type { Sale } from "@/lib/firestore/types";

/** Newest first — needs the sales(customerUid ASC, createdAt DESC)
 * composite index (see firestore.indexes.json). */
export async function getCustomerOrders(uid: string): Promise<Sale[]> {
  const snap = await salesCollection()
    .where("customerUid", "==", uid)
    .orderBy("createdAt", "desc")
    .get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/** Fetches a single order, but ONLY returns it if it actually belongs to
 * `uid` — the caller (app/(store)/account/orders/[id]/page.tsx) treats a
 * null return as a 404, never as "exists but you can't see it", so a
 * customer probing another customer's order id learns nothing about
 * whether it exists. */
export async function getCustomerOrder(uid: string, saleId: string): Promise<Sale | null> {
  const snap = await salesCollection().doc(saleId).get();
  const data = snap.data();
  if (!snap.exists || !data || data.customerUid !== uid) return null;
  return { id: snap.id, ...data };
}

/** The ONLY lookup app/(store)/orders/[token]/page.tsx uses — no login, no
 * customerUid check at all, since the high-entropy token itself (see
 * lib/server/orderToken.ts) IS the access control: whoever has it can see
 * this one order, exactly like a registered customer's order id can only
 * be seen by them. A single-field equality query needs no composite index.
 * Returns null for a missing/invalid token — the caller treats that as a
 * 404, same no-leak shape as getCustomerOrder. */
export async function getOrderByToken(token: string): Promise<Sale | null> {
  if (!token) return null;
  const snap = await salesCollection().where("orderToken", "==", token).limit(1).get();
  if (snap.empty) return null;
  const doc = snap.docs[0];
  return { id: doc.id, ...doc.data() };
}
