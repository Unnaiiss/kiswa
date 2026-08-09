/**
 * Marks an error's message as safe to return verbatim to a client — thrown
 * by our own business-validation code (recordSale, stockAdjust, stockIn,
 * combo validation, restockCancelledSale) for conditions the user is meant
 * to see and act on ("insufficient stock", "invalid selection", etc).
 *
 * Anything that is NOT an instance of this (a raw Firestore/network/
 * programming error) is assumed to potentially contain internal details
 * (driver internals, stack-adjacent text) and is never shown to the client
 * as-is — see lib/server/apiError.ts's toErrorResponse, which logs the full
 * error server-side either way and only echoes the message back when it's
 * a PublicError.
 */
export class PublicError extends Error {}
