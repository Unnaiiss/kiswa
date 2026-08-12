import { NextResponse } from "next/server";
import { getCustomerSession } from "@/lib/server/getCustomerSession";
import { customersCollection } from "@/lib/firestore/admin-collections";
import { profileUpdateBodySchema } from "@/lib/auth/customerValidation";
import { rateLimit } from "@/lib/server/rateLimit";

/** Lets a signed-in customer update their own name/phone/marketingOptIn.
 * Gated purely on the server-verified __customer_session cookie (never a
 * client-supplied uid), so a customer can only ever edit their own doc. */
export async function PATCH(request: Request) {
  const limited = rateLimit(request, "account:profile", {
    limit: 20,
    windowMs: 10 * 60 * 1000,
  });
  if (limited) return limited;

  const session = await getCustomerSession();
  if (!session) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const json = await request.json().catch(() => null);
  const parsed = profileUpdateBodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 },
    );
  }

  const { name, phone, marketingOptIn } = parsed.data;
  const update: Record<string, unknown> = {};
  if (name !== undefined) update.name = name;
  if (phone !== undefined) update.phone = phone;
  if (marketingOptIn !== undefined) update.marketingOptIn = marketingOptIn;

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ ok: true });
  }

  await customersCollection().doc(session.uid).set(update, { merge: true });
  return NextResponse.json({ ok: true });
}
