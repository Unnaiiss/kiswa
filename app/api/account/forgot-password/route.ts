import { NextResponse } from "next/server";
import { forgotPasswordBodySchema } from "@/lib/auth/customerValidation";
import { rateLimit } from "@/lib/server/rateLimit";

/**
 * Firebase's password-reset email is sent entirely by Firebase's own backend
 * via the CLIENT SDK's sendPasswordResetEmail() — there's no server-side
 * mail infrastructure in this app to send it ourselves, and the Admin SDK's
 * generatePasswordResetLink only generates a link, it doesn't deliver one.
 * This route exists purely as a rate-limit + validation gate the client
 * calls BEFORE triggering that client-side send, so a scripted retry storm
 * against the reset flow is throttled at our own layer too (defense in
 * depth alongside Firebase's own backend abuse protection on that action,
 * same reasoning as /api/auth/session and /api/account/session).
 *
 * Always returns the same generic 200 regardless of whether the email
 * actually exists — the client likewise always shows the same generic
 * message and silently swallows Firebase's auth/user-not-found error, so
 * this flow never leaks account existence at any layer.
 */
export async function POST(request: Request) {
  const limited = rateLimit(request, "account:forgot-password", {
    limit: 5,
    windowMs: 10 * 60 * 1000,
  });
  if (limited) return limited;

  const json = await request.json().catch(() => null);
  const parsed = forgotPasswordBodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
