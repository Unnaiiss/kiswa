/** Shared by cart-provider.tsx (new lines) and mergeCartItems.ts (re-keying
 * incoming saved-cart lines so they can never collide with existing ones). */
export function makeLineId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `line-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
