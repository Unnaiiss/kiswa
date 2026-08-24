import { adminDb } from "@/lib/firebase/admin";
import { customersCollection, salesCollection } from "@/lib/firestore/admin-collections";

/**
 * Called after a customer doc is created/touched (see app/api/account/
 * signup and app/api/account/session) — finds this customer's own past
 * GUEST orders (customerUid null, guestEmail/guestPhone set — see
 * SaleDoc's own doc comment) and links them by setting customerUid, so
 * they show up in /(store)/account/orders going forward.
 *
 * Matches on EITHER a verified email or the exact phone used on the order
 * — never an unverified email, since anyone could type someone else's
 * email address at signup and this would otherwise let them claim a
 * stranger's order history. Phone needs no such guard: it's compared
 * literally against what the guest themselves typed in at checkout, the
 * strongest signal available for it (this app has no phone/OTP
 * verification at all — see CLAUDE.md's "Customer accounts" section).
 *
 * Reads the customer's OWN email/phone off their own doc rather than
 * taking them as parameters, so both call sites (signup: phone only, no
 * verified email yet on a brand-new account; login: both, using the
 * ALREADY-signed-in customer's own real Firebase email + a `email_verified`
 * claim only login can supply) share one implementation with no risk of
 * drifting on what "this customer's email/phone" means.
 */
export async function linkGuestOrdersToCustomer(params: {
  uid: string;
  emailVerified: boolean;
}): Promise<{ linkedCount: number }> {
  const { uid, emailVerified } = params;
  const customerSnap = await customersCollection().doc(uid).get();
  const customer = customerSnap.data();
  if (!customer) return { linkedCount: 0 };

  const matchedIds = new Set<string>();

  if (emailVerified && customer.email) {
    const byEmail = await salesCollection()
      .where("customerUid", "==", null)
      .where("guestEmail", "==", customer.email)
      .get();
    for (const doc of byEmail.docs) matchedIds.add(doc.id);
  }

  if (customer.phone) {
    const byPhone = await salesCollection()
      .where("customerUid", "==", null)
      .where("guestPhone", "==", customer.phone)
      .get();
    for (const doc of byPhone.docs) matchedIds.add(doc.id);
  }

  if (matchedIds.size === 0) return { linkedCount: 0 };

  const batch = adminDb.batch();
  for (const id of matchedIds) {
    batch.update(salesCollection().doc(id), { customerUid: uid });
  }
  await batch.commit();

  return { linkedCount: matchedIds.size };
}
