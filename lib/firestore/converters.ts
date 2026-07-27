import type {
  DocumentData,
  FirestoreDataConverter,
  PartialWithFieldValue,
  QueryDocumentSnapshot,
  SnapshotOptions,
  WithFieldValue,
} from "firebase/firestore";
import type {
  AppUserDoc,
  InvoiceCounter,
  ProductDoc,
  RefundFlagDoc,
  SaleDoc,
  StockMovementDoc,
} from "./types";

function makeConverter<T extends DocumentData>(): FirestoreDataConverter<T> {
  return {
    toFirestore(value: WithFieldValue<T> | PartialWithFieldValue<T>) {
      return value as DocumentData;
    },
    fromFirestore(
      snapshot: QueryDocumentSnapshot,
      options?: SnapshotOptions,
    ): T {
      return snapshot.data(options) as T;
    },
  };
}

export const productConverter = makeConverter<ProductDoc>();
export const stockMovementConverter = makeConverter<StockMovementDoc>();
export const saleConverter = makeConverter<SaleDoc>();
export const userConverter = makeConverter<AppUserDoc>();
export const invoiceCounterConverter = makeConverter<InvoiceCounter>();
export const refundFlagConverter = makeConverter<RefundFlagDoc>();
