import { adminDb } from "@/lib/firebase/admin";
import {
  invoiceCounterConverter,
  productConverter,
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
