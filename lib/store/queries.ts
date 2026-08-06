import {
  bannersCollection,
  combosCollection,
  giftSectionDocRef,
  ourStorySectionDocRef,
  productsCollection,
} from "@/lib/firestore/admin-collections";
import { isComboCurrentlyValid } from "@/lib/combos";
import type {
  Banner,
  BannerDoc,
  Combo,
  ComboDoc,
  GiftSection,
  OurStorySection,
  Product,
  ProductDoc,
} from "@/lib/firestore/types";

// Storefront pages pass products straight into Client Components (product
// cards, variant selector), so the shape must be plain-serializable — a
// Firestore Timestamp instance in `createdAt` breaks that boundary and isn't
// needed by any storefront UI, so it's dropped here.
export type StoreProduct = Omit<Product, "createdAt">;

function toStoreProduct(id: string, data: ProductDoc): StoreProduct {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { createdAt, ...rest } = data;
  return { id, ...rest };
}

export async function getActiveProducts(): Promise<StoreProduct[]> {
  const snap = await productsCollection().where("isActive", "==", true).get();
  return snap.docs.map((doc) => toStoreProduct(doc.id, doc.data()));
}

export async function getFeaturedProducts(limit = 8): Promise<StoreProduct[]> {
  const products = await getActiveProducts();
  return products.slice(0, limit);
}

export async function getProductBySlug(
  slug: string,
): Promise<StoreProduct | null> {
  const snap = await productsCollection().doc(slug).get();
  const data = snap.data();
  if (!snap.exists || !data || !data.isActive) return null;
  return toStoreProduct(snap.id, data);
}

// Same createdAt/updatedAt-stripping rationale as StoreProduct above — the
// homepage carousel is a Client Component and can't receive raw Timestamps.
export type StoreBanner = Omit<Banner, "createdAt" | "updatedAt">;

function toStoreBanner(id: string, data: BannerDoc): StoreBanner {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { createdAt, updatedAt, ...rest } = data;
  return { id, ...rest };
}

export async function getActiveBanners(): Promise<StoreBanner[]> {
  const snap = await bannersCollection()
    .where("isActive", "==", true)
    .orderBy("order", "asc")
    .get();
  return snap.docs.map((doc) => toStoreBanner(doc.id, doc.data()));
}

// updatedAt-stripping for the same Timestamp-can't-cross-the-RSC-boundary
// reason as StoreProduct/StoreBanner above.
export type StoreGiftSection = Omit<GiftSection, "updatedAt">;

export async function getGiftSection(): Promise<StoreGiftSection | null> {
  const snap = await giftSectionDocRef().get();
  const data = snap.data();
  if (!snap.exists || !data) return null;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { updatedAt, ...rest } = data;
  return { id: snap.id, ...rest };
}

// Same updatedAt-stripping reason as StoreGiftSection above.
export type StoreOurStorySection = Omit<OurStorySection, "updatedAt">;

export async function getOurStorySection(): Promise<StoreOurStorySection | null> {
  const snap = await ourStorySectionDocRef().get();
  const data = snap.data();
  if (!snap.exists || !data) return null;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { updatedAt, ...rest } = data;
  return { id: snap.id, ...rest };
}

// createdAt/updatedAt stripped for the same RSC-boundary reason as above;
// validFrom/validUntil are dropped too since date-window filtering already
// happens server-side below — the client never needs the raw Timestamps.
export type StoreCombo = Omit<
  Combo,
  "createdAt" | "updatedAt" | "validFrom" | "validUntil"
>;

function toStoreCombo(id: string, data: ComboDoc): StoreCombo {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { createdAt, updatedAt, validFrom, validUntil, ...rest } = data;
  return { id, ...rest };
}

export async function getActiveCombos(): Promise<StoreCombo[]> {
  const snap = await combosCollection()
    .where("isActive", "==", true)
    .orderBy("order", "asc")
    .get();
  const now = new Date();
  return snap.docs
    .filter((doc) => isComboCurrentlyValid(doc.data(), now))
    .map((doc) => toStoreCombo(doc.id, doc.data()));
}

export async function getComboBySlug(slug: string): Promise<StoreCombo | null> {
  const snap = await combosCollection().where("slug", "==", slug).limit(1).get();
  if (snap.empty) return null;
  const doc = snap.docs[0];
  const data = doc.data();
  if (!isComboCurrentlyValid(data, new Date())) return null;
  return toStoreCombo(doc.id, data);
}
