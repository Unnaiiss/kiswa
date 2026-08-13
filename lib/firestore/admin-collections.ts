import { adminDb } from "@/lib/firebase/admin";
import {
  addressConverter,
  announcementBarConverter,
  bannerConverter,
  comboConverter,
  customerConverter,
  giftSectionConverter,
  importedSectionConverter,
  invoiceCounterConverter,
  notificationSettingsConverter,
  ourStorySectionConverter,
  pendingOrderConverter,
  productConverter,
  refundFlagConverter,
  saleConverter,
  siteSettingsConverter,
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

// Storefront customer accounts — entirely separate from usersCollection()
// (admin/staff). See CustomerDoc's own comment for why this needs no role
// claim at all.
export function customersCollection() {
  return adminDb.collection("customers").withConverter(customerConverter);
}

// customers/{uid}/addresses/{id} — always scoped through the caller-supplied
// uid, which every route in this app derives from the verified
// __customer_session cookie (getCustomerSession), never from client input —
// see app/api/account/addresses/**.
export function customerAddressesCollection(uid: string) {
  return customersCollection().doc(uid).collection("addresses").withConverter(addressConverter);
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

export function combosCollection() {
  return adminDb.collection("combos").withConverter(comboConverter);
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

export function announcementBarDocRef() {
  return siteContentCollection()
    .doc("announcementBar")
    .withConverter(announcementBarConverter);
}

export function importedSectionDocRef() {
  return siteContentCollection()
    .doc("importedSection")
    .withConverter(importedSectionConverter);
}

export function siteSettingsDocRef() {
  return siteContentCollection().doc("siteSettings").withConverter(siteSettingsConverter);
}

export function notificationSettingsDocRef() {
  return siteContentCollection()
    .doc("notificationSettings")
    .withConverter(notificationSettingsConverter);
}
