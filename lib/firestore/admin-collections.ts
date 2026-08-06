import { adminDb } from "@/lib/firebase/admin";
import {
  bannerConverter,
  giftSectionConverter,
  invoiceCounterConverter,
  ourStorySectionConverter,
  pendingOrderConverter,
  productConverter,
  refundFlagConverter,
  saleConverter,
  stockMovementConverter,
  userConverter,
} from "./admin-converters";

export function productsCollection() {
  return adminDb.collection("products").withConverter(productConverter);
}

export function stockMovementsCollection() {
  return adminDb
    .collection("stockMovements")
    .withConverter(stockMovementConverter);
}

export function salesCollection() {
  return adminDb.collection("sales").withConverter(saleConverter);
}

export function usersCollection() {
  return adminDb.collection("users").withConverter(userConverter);
}

export function invoiceCounterDoc() {
  return adminDb
    .collection("counters")
    .doc("invoices")
    .withConverter(invoiceCounterConverter);
}

export function pendingOrdersCollection() {
  return adminDb
    .collection("pendingOrders")
    .withConverter(pendingOrderConverter);
}

export function refundFlagsCollection() {
  return adminDb
    .collection("refundFlags")
    .withConverter(refundFlagConverter);
}

export function bannersCollection() {
  return adminDb.collection("banners").withConverter(bannerConverter);
}

// One fixed doc per homepage section, each with its own shape — the
// converter is applied per-doc-ref below rather than at the collection
// level, since a single collection-level converter can't type multiple
// distinct doc shapes.
export function siteContentCollection() {
  return adminDb.collection("siteContent");
}

export function giftSectionDocRef() {
  return siteContentCollection().doc("giftSection").withConverter(giftSectionConverter);
}

export function ourStorySectionDocRef() {
  return siteContentCollection()
    .doc("ourStory")
    .withConverter(ourStorySectionConverter);
}
