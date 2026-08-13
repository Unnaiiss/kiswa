import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { customerAddressesCollection } from "@/lib/firestore/admin-collections";
import type { Address, AddressDoc, DeliveryAddressSnapshot } from "@/lib/firestore/types";

export class AddressNotFoundError extends Error {}

/** Strips a saved Address down to the plain snapshot shape a sale/pendingOrder
 * stores (lib/firestore/types.ts's DeliveryAddressSnapshot) — a copy, not a
 * live reference, since the customer's saved address can be edited/deleted
 * after the order is placed. */
export function toDeliveryAddressSnapshot(address: Address): DeliveryAddressSnapshot {
  return {
    label: address.label,
    fullName: address.fullName,
    phone: address.phone,
    line1: address.line1,
    line2: address.line2,
    city: address.city,
    district: address.district,
    state: address.state,
    pincode: address.pincode,
    landmark: address.landmark,
  };
}

/** Newest first, with the default address always pinned to the top
 * regardless of age — matches how most delivery-address pickers present
 * "your usual address" first. */
export async function listAddresses(uid: string): Promise<Address[]> {
  const snap = await customerAddressesCollection(uid).get();
  const addresses = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  addresses.sort((a, b) => {
    if (a.isDefault !== b.isDefault) return a.isDefault ? -1 : 1;
    return b.createdAt.toDate().getTime() - a.createdAt.toDate().getTime();
  });
  return addresses;
}

/** A single address, scoped to the caller-supplied uid — used by checkout
 * (create-order, cod) to resolve a customer's chosen addressId into a real
 * address server-side, never trusting a client-submitted address blob
 * directly. Returns null both when the id doesn't exist and when it belongs
 * to a different customer (same no-leak shape as getCustomerOrder), so a
 * probed id can't distinguish the two. */
export async function getAddressById(uid: string, addressId: string): Promise<Address | null> {
  const snap = await customerAddressesCollection(uid).doc(addressId).get();
  const data = snap.data();
  if (!snap.exists || !data) return null;
  return { id: snap.id, ...data };
}

type AddressInput = Omit<AddressDoc, "createdAt" | "updatedAt">;

/** A customer's very first address is always forced default (there's no
 * legitimate "no default" state once at least one address exists) — beyond
 * that, isDefault follows the caller's choice. Unsetting every OTHER
 * address's isDefault happens in the same transaction, so exactly one
 * address is ever default at a time; this is the sole place that invariant
 * is enforced (Firestore rules can't express "at most one doc in this
 * subcollection has field X true"). */
export async function createAddress(uid: string, input: AddressInput): Promise<string> {
  const col = customerAddressesCollection(uid);
  return adminDb.runTransaction(async (tx) => {
    const existing = await tx.get(col);
    const shouldBeDefault = input.isDefault || existing.empty;

    if (shouldBeDefault) {
      for (const doc of existing.docs) {
        if (doc.data().isDefault) tx.update(doc.ref, { isDefault: false });
      }
    }

    const ref = col.doc();
    tx.set(ref, {
      ...input,
      isDefault: shouldBeDefault,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    return ref.id;
  });
}

export async function updateAddress(
  uid: string,
  addressId: string,
  input: Partial<AddressInput>,
): Promise<void> {
  const col = customerAddressesCollection(uid);
  const ref = col.doc(addressId);

  await adminDb.runTransaction(async (tx) => {
    // Firestore transactions require every read before any write, so the
    // (possibly unnecessary) sibling read happens unconditionally here
    // rather than only when input.isDefault is true.
    const [snap, existing] = await Promise.all([tx.get(ref), tx.get(col)]);
    if (!snap.exists) throw new AddressNotFoundError();

    if (input.isDefault === true) {
      for (const doc of existing.docs) {
        if (doc.id !== addressId && doc.data().isDefault) tx.update(doc.ref, { isDefault: false });
      }
    }

    tx.update(ref, { ...input, updatedAt: FieldValue.serverTimestamp() });
  });
}

/** If the deleted address was the default and others remain, promotes the
 * most recently created one — a customer with any saved addresses always
 * has exactly one default, same invariant as createAddress. */
export async function deleteAddress(uid: string, addressId: string): Promise<void> {
  const col = customerAddressesCollection(uid);
  const ref = col.doc(addressId);

  await adminDb.runTransaction(async (tx) => {
    const [snap, all] = await Promise.all([tx.get(ref), tx.get(col)]);
    if (!snap.exists) return; // already gone — deleting is idempotent

    const wasDefault = snap.data()?.isDefault === true;
    tx.delete(ref);

    if (wasDefault) {
      const remaining = all.docs.filter((d) => d.id !== addressId);
      if (remaining.length > 0) {
        remaining.sort((a, b) => b.data().createdAt.toDate().getTime() - a.data().createdAt.toDate().getTime());
        tx.update(remaining[0].ref, { isDefault: true });
      }
    }
  });
}
