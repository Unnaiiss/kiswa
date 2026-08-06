import { adminDb } from "@/lib/firebase/admin";
import {
  bannerConverter,
  giftSectionConverter,
  invoiceCounterConverter,
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

export function siteContentCollection() {
  return adminDb.collection("siteContent").withConverter(giftSectionConverter);
}

export function giftSectionDocRef() {
  return siteContentCollection().doc("giftSection");
}
