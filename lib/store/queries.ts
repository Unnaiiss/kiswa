import {
  bannersCollection,
  combosCollection,
  giftSectionDocRef,
  ourStorySectionDocRef,
  productsCollection,
} from "@/lib/firestore/admin-collections";
import { explainComboUnfulfillable, isComboCurrentlyValid } from "@/lib/combos";
import type {
  Combo,
  ComboBannerDoc,
  ComboDoc,
  GiftSection,
  ImageBannerDoc,
  OurStorySection,
  Product,
  ProductDoc,
} from "@/lib/firestore/types";

// Plain Omit<Union, K> collapses a discriminated union down to only its
// shared keys (Product is now attar | imported) — this distributes Omit
// over each union member first, so the productType discriminant keeps
// narrowing StoreProduct correctly downstream.
type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;

// Storefront pages pass products straight into Client Components (product
// cards, variant selector), so the shape must be plain-serializable — a
// Firestore Timestamp instance in `createdAt` breaks that boundary and isn't
// needed by any storefront UI, so it's dropped here.
export type StoreProduct = DistributiveOmit<Product, "createdAt">;

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
// A combo slide additionally carries the live combo snapshot it was resolved
// against (see getActiveBanners) — the carousel never touches Firestore itself.
export type StoreBanner =
  | (Omit<ImageBannerDoc, "createdAt" | "updatedAt"> & { id: string })
  | (Omit<ComboBannerDoc, "createdAt" | "updatedAt"> & {
      id: string;
      combo: {
        slug: string;
        title: string;
        description: string;
        imageUrl: string | null;
        imageUrlMobile: string | null;
        comboPriceInr: number;
        originalPriceInr: number;
        badgeText: string | null;
      };
    });

/** Resolves the carousel's live list: image banners pass through as-is;
 * combo banners are expanded against a live combo doc and dropped entirely
 * (never rendered as a broken/dangling slide) if that combo is deleted,
 * inactive, outside its validFrom/validUntil window, or currently
 * unfulfillable from stock. Every exclusion is logged server-side with its
 * specific reason (this was previously silent, which made a legitimately
 * out-of-stock combo indistinguishable from an actual bug) — see also
 * components/admin/banners/banner-table.tsx, which surfaces the same reason
 * next to the banner in admin. Fetches ALL combos (not just currently-valid
 * ones, unlike getActiveCombos) so "deleted" and "inactive/expired" can be
 * told apart in the log instead of collapsing into one case. */
export async function getActiveBanners(): Promise<StoreBanner[]> {
  const snap = await bannersCollection()
    .where("isActive", "==", true)
    .orderBy("order", "asc")
    .get();
  const raw = snap.docs.map((doc) => ({ id: doc.id, data: doc.data() }));

  const hasComboBanner = raw.some(({ data }) => data.bannerType === "combo");
  const [comboDocs, products] = hasComboBanner
    ? await Promise.all([combosCollection().get(), getActiveProducts()])
    : [null, [] as StoreProduct[]];
  const allCombosById = new Map(
    (comboDocs?.docs ?? []).map((doc) => [doc.id, { id: doc.id, ...doc.data() }]),
  );
  const productsById = new Map(products.map((p) => [p.id, p]));

  const result: StoreBanner[] = [];
  for (const { id, data } of raw) {
    if (data.bannerType !== "combo") {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { createdAt, updatedAt, ...rest } = data;
      result.push({ id, ...rest, bannerType: "image" });
      continue;
    }

    const combo = allCombosById.get(data.comboId);
    if (!combo) {
      console.warn(
        `[getActiveBanners] excluding combo banner ${id}: comboId ${data.comboId} does not exist (deleted)`,
      );
      continue;
    }
    if (!isComboCurrentlyValid(combo)) {
      const reason = !combo.isActive
        ? "combo is inactive"
        : combo.validFrom && combo.validFrom.toDate() > new Date()
          ? `combo's validFrom (${combo.validFrom.toDate().toISOString()}) is in the future`
          : `combo's validUntil (${combo.validUntil?.toDate().toISOString()}) is in the past`;
      console.warn(
        `[getActiveBanners] excluding combo banner ${id}: combo "${combo.title}" (${combo.id}) — ${reason}`,
      );
      continue;
    }
    const unfulfillableReason = explainComboUnfulfillable(combo, productsById);
    if (unfulfillableReason) {
      console.warn(
        `[getActiveBanners] excluding combo banner ${id}: combo "${combo.title}" (${combo.id}) is unfulfillable — ${unfulfillableReason}`,
      );
      continue;
    }

    result.push({
      id,
      bannerType: "combo",
      comboId: data.comboId,
      headlineOverride: data.headlineOverride ?? null,
      buttonLabelOverride: data.buttonLabelOverride ?? null,
      order: data.order,
      isActive: data.isActive,
      combo: {
        slug: combo.slug,
        title: combo.title,
        description: combo.description,
        imageUrl: combo.imageUrl,
        imageUrlMobile: combo.imageUrlMobile,
        comboPriceInr: combo.comboPriceInr,
        originalPriceInr: combo.originalPriceInr,
        badgeText: combo.badgeText,
      },
    });
  }
  return result;
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
