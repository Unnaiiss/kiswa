import { bannersCollection, productsCollection } from "@/lib/firestore/admin-collections";
import type { Banner, BannerDoc, Product, ProductDoc } from "@/lib/firestore/types";

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
