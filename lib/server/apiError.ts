import { NextResponse } from "next/server";
import { logError } from "./logger";
import { PublicError } from "./publicError";

/**
 * Standard shape for an API route's catch block around business logic
 * (recordSale, stockAdjust, stockIn, restockCancelledSale, etc): always
 * logs the full error server-side, but only echoes `err.message` back to
 * the client when it's a PublicError (our own deliberate validation
 * message) — anything else (a raw Firestore/network error, a bug) gets the
 * generic `fallbackMessage` instead, so an unexpected exception can never
 * leak internal details through the API response.
 */
export function toErrorResponse(
  err: unknown,
  context: string,
  fallbackMessage: string,
  status = 409,
): NextResponse {
  logError(context, err);
  const message = err instanceof PublicError ? err.message : fallbackMessage;
  return NextResponse.json({ error: message }, { status });
}
