import { NextResponse } from "next/server";
import { getCustomerSession } from "@/lib/server/getCustomerSession";
import { AddressNotFoundError, deleteAddress, updateAddress } from "@/lib/server/customerAddresses";
import { addressUpdateBodySchema } from "@/lib/auth/customerValidation";
import { rateLimit } from "@/lib/server/rateLimit";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/** Updates (including toggling isDefault) one of the signed-in customer's
 * own addresses. The {id} always resolves against
 * customerAddressesCollection(session.uid) — a client can never point this
 * at another customer's subcollection no matter what id they pass, since
 * the uid segment of the path comes from the verified session, not from
 * this route's params. */
export async function PATCH(request: Request, { params }: RouteParams) {
  const limited = rateLimit(request, "account:addresses", {
    limit: 30,
    windowMs: 10 * 60 * 1000,
  });
  if (limited) return limited;

  const session = await getCustomerSession();
  if (!session) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const { id } = await params;
  const json = await request.json().catch(() => null);
  const parsed = addressUpdateBodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 },
    );
  }

  try {
    await updateAddress(session.uid, id, parsed.data);
  } catch (err) {
    if (err instanceof AddressNotFoundError) {
      return NextResponse.json({ error: "Address not found" }, { status: 404 });
    }
    return NextResponse.json({ error: "Could not update address" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request, { params }: RouteParams) {
  const limited = rateLimit(request, "account:addresses", {
    limit: 30,
    windowMs: 10 * 60 * 1000,
  });
  if (limited) return limited;

  const session = await getCustomerSession();
  if (!session) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const { id } = await params;
  await deleteAddress(session.uid, id);
  return NextResponse.json({ ok: true });
}
