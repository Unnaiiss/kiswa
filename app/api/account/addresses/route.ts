import { NextResponse } from "next/server";
import { getCustomerSession } from "@/lib/server/getCustomerSession";
import { createAddress, listAddresses } from "@/lib/server/customerAddresses";
import { addressBodySchema } from "@/lib/auth/customerValidation";
import { rateLimit } from "@/lib/server/rateLimit";

/** Lets components/account/address-list.tsx re-fetch its own list directly
 * after a mutation instead of depending on router.refresh() timing to
 * repropagate fresh server-component props back down into the client tree —
 * simpler to reason about and avoids relying on RSC-refresh timing. */
export async function GET() {
  const session = await getCustomerSession();
  if (!session) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  const addresses = await listAddresses(session.uid);
  const plain = addresses.map(({ createdAt, updatedAt, ...rest }) => {
    void createdAt;
    void updatedAt;
    return rest;
  });
  return NextResponse.json({ addresses: plain });
}

/** Creates a new saved address for the signed-in customer. Always scoped to
 * session.uid (never a client-supplied id) — see
 * lib/firestore/admin-collections.ts's customerAddressesCollection. */
export async function POST(request: Request) {
  const limited = rateLimit(request, "account:addresses", {
    limit: 30,
    windowMs: 10 * 60 * 1000,
  });
  if (limited) return limited;

  const session = await getCustomerSession();
  if (!session) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const json = await request.json().catch(() => null);
  const parsed = addressBodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 },
    );
  }

  const { label, fullName, phone, line1, line2, city, district, state, pincode, landmark, isDefault } =
    parsed.data;
  const id = await createAddress(session.uid, {
    label,
    fullName,
    phone,
    line1,
    line2: line2 ?? null,
    city,
    district,
    state,
    pincode,
    landmark: landmark ?? null,
    isDefault,
  });

  return NextResponse.json({ ok: true, id });
}
