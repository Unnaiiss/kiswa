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
