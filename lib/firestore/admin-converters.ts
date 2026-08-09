import type {
  DocumentData,
  FirestoreDataConverter,
  PartialWithFieldValue,
  QueryDocumentSnapshot,
  WithFieldValue,
} from "firebase-admin/firestore";
import type {
  AnnouncementBarDoc,
  AppUserDoc,
  BannerDoc,
  ComboDoc,
  GiftSectionDoc,
  ImportedSectionDoc,
  InvoiceCounter,
  OurStorySectionDoc,
  PendingOrderDoc,
  ProductDoc,
  RefundFlagDoc,
  SaleDoc,
  SiteSettingsDoc,
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
export const pendingOrderConverter = makeConverter<PendingOrderDoc>();
export const refundFlagConverter = makeConverter<RefundFlagDoc>();
export const bannerConverter = makeConverter<BannerDoc>();
export const giftSectionConverter = makeConverter<GiftSectionDoc>();
export const ourStorySectionConverter = makeConverter<OurStorySectionDoc>();
export const comboConverter = makeConverter<ComboDoc>();
export const announcementBarConverter = makeConverter<AnnouncementBarDoc>();
export const importedSectionConverter = makeConverter<ImportedSectionDoc>();
export const siteSettingsConverter = makeConverter<SiteSettingsDoc>();
