import type { StoreProduct } from "./queries";

export function getCategories(products: StoreProduct[]): string[] {
  return [...new Set(products.map((p) => p.category))].sort();
}
