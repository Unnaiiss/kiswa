import { NextResponse } from "next/server";
import { z } from "zod";
import { adminDb } from "@/lib/firebase/admin";
import { combosCollection, pendingOrdersCollection, productsCollection } from "@/lib/firestore/admin-collections";
import { recordSale } from "@/lib/server/recordSale";
import { AuthError, requireRole } from "@/lib/server/authGuard";
import { livePriceForVariant } from "@/lib/server/productLookup";
import { toErrorResponse } from "@/lib/server/apiError";
import type { ComboDoc, PendingOrderDoc, ProductDoc } from "@/lib/firestore/types";

/**
 * Converts a customer-linked WhatsApp draft (created by
 * app/api/account/whatsapp-order/route.ts when a signed-in customer tapped
 * "Order on WhatsApp") into a real sale in one click — no re-keying. Re-
 * derives every price from live product/combo data (never trusts the
 * draft's own snapshot, same discipline as every other order-recording
 * route), then calls the same recordSale transaction as POS/the manual
 * WhatsApp re-key screen, passing the draft's customerUid and
 * deliveryAddress through so the resulting sale is linked back to the
 * account. Rejects an already-converted or expired draft.
 *
 * The draft is claimed via an atomic 'created' -> 'processing' transaction
 * BEFORE any pricing/recordSale work happens — mirroring
 * lib/server/finalizeOnlineOrder.ts's lock for the Razorpay flow. A plain
 * read-then-later-update (the original shape of this route) is a real
 * TOCTOU race: two concurrent "Convert to sale" requests for the same
 * draft could both pass a `status !== "created"` check before either one
 * writes "completed", each independently calling recordSale — creating two
 * separate sales and double-decrementing stock. Confirmed via a 5-way
 * parallel-request test before this fix (5/5 succeeded, one draft became 5
 * sales) and fixed here the same way finalizeOnlineOrder already was.
 */

const bodySchema = z.object({
  paymentMethod: z.enum(["cash", "upi", "card"]),
});

type LockResult =
  | { ok: true; data: PendingOrderDoc }
  | { ok: false; status: number; error: string };

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  let decoded;
  try {
    decoded = await requireRole(request, ["admin"]);
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }

  const { id } = await params;
  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const ref = pendingOrdersCollection().doc(id);

  // Lock: atomically move 'created' -> 'processing', or report whatever
  // state the draft is already in — this is the ONLY thing standing between
  // two racing requests, so it must be a single transaction, not a
  // read-then-later-write pair.
  const lock = await adminDb.runTransaction<LockResult>(async (tx) => {
    const snap = await tx.get(ref);
    const data = snap.data();
    if (!snap.exists || !data) return { ok: false, status: 404, error: "Draft not found" };
    if (data.source !== "whatsapp") return { ok: false, status: 400, error: "Not a WhatsApp draft" };
    if (data.status !== "created") {
      return {
        ok: false,
        status: 409,
        error: data.status === "completed" ? "This draft was already converted." : "This draft can no longer be converted.",
      };
    }
    if (data.expiresAt && data.expiresAt.toDate() < new Date()) {
      return { ok: false, status: 409, error: "This draft has expired." };
    }
    tx.update(ref, { status: "processing" });
    return { ok: true, data };
  });

  if (!lock.ok) {
    return NextResponse.json({ error: lock.error }, { status: lock.status });
  }
  const draft = lock.data;

  // Re-derive prices from live data — never trust the draft's own snapshot,
  // same discipline as every other order-recording route in this app.
  const qtyByProductVariant = new Map<string, Map<string, number>>();
  for (const item of draft.items) {
    if (item.kind !== "product") continue;
    const perVariant = qtyByProductVariant.get(item.productId) ?? new Map<string, number>();
    perVariant.set(item.variantId, (perVariant.get(item.variantId) ?? 0) + item.qty);
    qtyByProductVariant.set(item.productId, perVariant);
  }

  const productIds = [...qtyByProductVariant.keys()];
  const productSnaps = await Promise.all(productIds.map((pid) => productsCollection().doc(pid).get()));
  const priceByVariant = new Map<string, number>();
  for (const [idx, pSnap] of productSnaps.entries()) {
    const productId = productIds[idx];
    const product: ProductDoc | undefined = pSnap.data();
    if (!pSnap.exists || !product) {
      return NextResponse.json({ error: "A product in this draft no longer exists." }, { status: 409 });
    }
    const perVariant = qtyByProductVariant.get(productId)!;
    for (const variantId of perVariant.keys()) {
      const price = livePriceForVariant(product, variantId);
      if (price === null) {
        return NextResponse.json({ error: "A variant in this draft no longer exists." }, { status: 409 });
      }
      priceByVariant.set(`${productId}:${variantId}`, price);
    }
  }

  const comboIds = [...new Set(draft.items.filter((i) => i.kind === "combo").map((i) => i.comboId))];
  const comboSnaps = await Promise.all(comboIds.map((cid) => combosCollection().doc(cid).get()));
  const comboPriceById = new Map<string, number>();
  for (const [idx, cSnap] of comboSnaps.entries()) {
    const combo: ComboDoc | undefined = cSnap.data();
    if (!cSnap.exists || !combo) {
      return NextResponse.json({ error: "A combo in this draft no longer exists." }, { status: 409 });
    }
    comboPriceById.set(comboIds[idx], combo.comboPriceInr);
  }

  let subtotal = 0;
  const recordItems = draft.items.map((item) => {
    if (item.kind === "product") {
      const price = priceByVariant.get(`${item.productId}:${item.variantId}`)!;
      subtotal += price * item.qty;
      return {
        kind: "product" as const,
        productId: item.productId,
        variantId: item.variantId,
        qty: item.qty,
        isGift: item.isGift ?? false,
        giftRecipientName: item.giftRecipientName ?? null,
        giftMessage: item.giftMessage ?? null,
        giftSenderName: item.giftSenderName ?? null,
        giftWrap: item.giftWrap ?? false,
      };
    }
    const price = comboPriceById.get(item.comboId)!;
    subtotal += price * item.qty;
    return {
      kind: "combo" as const,
      comboId: item.comboId,
      qty: item.qty,
      selections: item.selections,
    };
  });

  try {
    const { saleId, invoiceNo } = await recordSale({
      channel: "online",
      customerName: draft.customerName,
      customerPhone: draft.customerPhone,
      items: recordItems,
      discount: 0,
      paymentMethod: parsed.data.paymentMethod,
      paymentStatus: "paid",
      razorpayOrderId: null,
      razorpayPaymentId: null,
      orderStatus: "pending",
      shippingAddress: null,
      createdByUid: decoded.uid,
      createdByName: decoded.name ?? null,
      customerUid: draft.customerUid ?? null,
      deliveryAddress: draft.deliveryAddress ?? null,
    });

    await ref.update({ status: "completed", saleId, invoiceNo });

    return NextResponse.json({ saleId, invoiceNo, subtotal, total: subtotal });
  } catch (err) {
    // recordSale rejected this (e.g. stock ran out between the draft being
    // created and converted) — no sale was created, so release the lock
    // back to 'created' rather than leaving the draft stuck in 'processing'
    // forever. Unlike finalizeOnlineOrder's Razorpay flow, no payment has
    // been captured at this point, so there's nothing to refund-flag — a
    // fresh "Convert to sale" click is a safe, ordinary retry.
    await ref.update({ status: "created" }).catch(() => {});
    return toErrorResponse(err, "admin/whatsapp-orders/convert", "Could not convert this draft.");
  }
}
