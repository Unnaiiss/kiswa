import type {
  DocumentData,
  FirestoreDataConverter,
  PartialWithFieldValue,
  QueryDocumentSnapshot,
  WithFieldValue,
} from "firebase-admin/firestore";
import type {
  AppUserDoc,
  InvoiceCounter,
  ProductDoc,
  SaleDoc,
  StockMovementDoc,
} from "./types";

function makeConverter<T extends DocumentData>(): FirestoreDataConverter<T> {
  return {
    toFirestore(value: WithFieldValue<T> | PartialWithFieldValue<T>) {
      return value as DocumentData;
    },
    fromFirestore(snapshot: QueryDocumentSnapshot): T {
      return snapshot.data() as T;
    },
  };
}

export const productConverter = makeConverter<ProductDoc>();
export const stockMovementConverter = makeConverter<StockMovementDoc>();
export const saleConverter = makeConverter<SaleDoc>();
export const userConverter = makeConverter<AppUserDoc>();
export const invoiceCounterConverter = makeConverter<InvoiceCounter>();
