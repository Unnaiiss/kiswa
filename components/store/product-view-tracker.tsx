"use client";

import { useEffect } from "react";
import { trackViewContent } from "@/lib/analytics/metaPixel";

/** Fires once per product page load. Value is the product's display price
 * (starting price for attar's multiple variants, the single price for
 * imported) — a representative value for Meta's optimization, not tied to
 * whichever variant the visitor eventually picks. */
export function ProductViewTracker({
  productId,
  productName,
  value,
}: {
  productId: string;
  productName: string;
  value: number;
}) {
  useEffect(() => {
    trackViewContent({ contentId: productId, contentName: productName, value });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fire once per distinct product, not on every render
  }, [productId]);

  return null;
}
