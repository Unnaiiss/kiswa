import { randomBytes } from "node:crypto";

/**
 * A dedicated, high-entropy (192-bit) public "capability" secret for
 * /orders/[token] — deliberately not the Firestore doc id (an internal
 * implementation detail, not meant to double as a customer-facing secret)
 * and not derived from anything guessable (invoice numbers are sequential
 * — KSW-YYYY-NNNN — so those alone must never grant order access; see
 * app/api/track/route.ts's separate invoice+phone lookup for that path).
 * base64url so it's URL-safe with no padding to strip.
 */
export function generateOrderToken(): string {
  return randomBytes(24).toString("base64url");
}
