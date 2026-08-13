import { NextResponse } from "next/server";
import { z } from "zod";
import { getCustomerSession } from "@/lib/server/getCustomerSession";
import { customersCollection } from "@/lib/firestore/admin-collections";
import { rateLimit } from "@/lib/server/rateLimit";

const giftSchema = z.object({
  recipientName: z.string(),
  message: z.string(),
  senderName: z.string(),
  giftWrap: z.boolean(),
});

const comboSchema = z.object({
  comboId: z.string(),
  comboTitle: z.string(),
  components: z.array(
    z.object({
      productId: z.string(),
      variantId: z.string(),
      productName: z.string(),
      variantLabel: z.string(),
      qty: z.number(),
    }),
  ),
  selections: z.array(z.object({ productId: z.string(), variantId: z.string() })),
});

const cartItemSchema = z.object({
  lineId: z.string(),
  productId: z.string(),
  variantId: z.string(),
  productName: z.string(),
  slug: z.string(),
  variantLabel: z.string(),
  type: z.enum(["oil", "spray"]),
  sizeMl: z.number(),
  unitPrice: z.number(),
  oilMlPerUnit: z.number(),
  qty: z.number().int().positive(),
  gift: giftSchema.optional(),
  combo: comboSchema.optional(),
});

const bodySchema = z.object({
  items: z.array(cartItemSchema).max(100),
});

/** Lets a signed-in customer's cart survive a cleared browser or a new
 * device — GET returns whatever was last saved (empty if never saved), PUT
 * overwrites it. Debounced client-side by lib/cart/cart-provider.tsx on
 * every cart change while signed in; the merge with whatever's currently in
 * the browser's own localStorage cart happens client-side (see
 * lib/cart/mergeCartItems.ts) — this route only ever stores/returns a flat
 * snapshot, no merge logic here. */
export async function GET() {
  const session = await getCustomerSession();
  if (!session) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  const snap = await customersCollection().doc(session.uid).get();
  const data = snap.data();
  return NextResponse.json({ items: data?.cart ?? [] });
}

export async function PUT(request: Request) {
  const limited = rateLimit(request, "account:cart", { limit: 30, windowMs: 60 * 1000 });
  if (limited) return limited;

  const session = await getCustomerSession();
  if (!session) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  await customersCollection().doc(session.uid).set({ cart: parsed.data.items }, { merge: true });
  return NextResponse.json({ ok: true });
}
