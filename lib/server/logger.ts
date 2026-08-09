/**
 * Structured server-side error logging — one JSON line per error, so a log
 * aggregator (or just `grep`) can parse it, with any of our own secret env
 * var VALUES scrubbed from the message/stack/meta first. This guards
 * against a rare but real failure mode: a raw error from a third-party SDK
 * (Firestore, Razorpay) whose message happens to embed a request URL or
 * header that contains a secret we passed it — our own code never
 * interpolates secrets into strings, but a library's internals aren't under
 * our control the same way.
 */

const SECRET_ENV_VAR_NAMES = [
  "FIREBASE_SERVICE_ACCOUNT_KEY",
  "RAZORPAY_KEY_SECRET",
  "RAZORPAY_WEBHOOK_SECRET",
  "RAZORPAY_KEY_ID",
];

function redact(text: string): string {
  let result = text;
  for (const name of SECRET_ENV_VAR_NAMES) {
    const value = process.env[name];
    // Skip short/empty values — redacting a 1-2 char match would mangle
    // unrelated text and defeats the purpose (a real secret is always long).
    if (value && value.length >= 8) {
      result = result.split(value).join(`[REDACTED:${name}]`);
    }
  }
  return result;
}

/**
 * Logs `err` with full detail (message + stack, redacted) server-side —
 * this is NOT what gets shown to the client. See lib/server/apiError.ts's
 * toErrorResponse for the client-facing half of this pattern.
 */
export function logError(context: string, err: unknown, meta?: Record<string, unknown>): void {
  const message = err instanceof Error ? err.message : String(err);
  const stack = err instanceof Error ? err.stack : undefined;

  const entry = {
    level: "error" as const,
    timestamp: new Date().toISOString(),
    context,
    message: redact(message),
    ...(stack && { stack: redact(stack) }),
    ...(meta && { meta: JSON.parse(redact(JSON.stringify(meta))) }),
  };

  console.error(JSON.stringify(entry));
}
