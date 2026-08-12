import { NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase/admin";
import {
  createCustomerSessionCookie,
  CUSTOMER_SESSION_COOKIE_NAME,
  CUSTOMER_SESSION_MAX_AGE_MS,
} from "@/lib/server/customerSessionCookie";
import { touchCustomerOnLogin } from "@/lib/server/customers";
import { sessionBodySchema } from "@/lib/auth/customerValidation";
import { rateLimit } from "@/lib/server/rateLimit";

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};

/** Used by both customer email/password login AND Google sign-in — in both
 * cases the client has already authenticated with Firebase and just needs a
 * server session minted. Handles first-ever sign-in too (a Google user may
 * never have used the dedicated /account/signup form), via
 * touchCustomerOnLogin. */
export async function POST(request: Request) {
  const limited = rateLimit(request, "account:session", {
    limit: 15,
    windowMs: 10 * 60 * 1000,
  });
  if (limited) return limited;

  const json = await request.json().catch(() => null);
  const parsed = sessionBodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  let decoded: Awaited<ReturnType<typeof adminAuth.verifyIdToken>>;
  try {
    decoded = await adminAuth.verifyIdToken(parsed.data.idToken);
  } catch {
    return NextResponse.json({ error: "Could not sign you in" }, { status: 401 });
  }

  // Critical: a customer session must never be mintable for a staff/admin
  // account. This is defense in depth (verifyCustomerSessionCookie already
  // refuses to trust a role claim even if one somehow ended up in a customer
  // session cookie), but rejecting it here also gives a clear, honest error
  // instead of silently minting a cookie that would never actually work.
  const role = (decoded as typeof decoded & { role?: string }).role;
  if (role === "admin" || role === "staff") {
    return NextResponse.json(
      { error: "This account is for staff/admin use — please sign in at /login instead." },
      { status: 403 },
    );
  }

  await touchCustomerOnLogin({
    uid: decoded.uid,
    email: decoded.email ?? null,
    displayName: (decoded.name as string | undefined) ?? null,
  });

  let sessionCookie: string;
  try {
    sessionCookie = await createCustomerSessionCookie(parsed.data.idToken);
  } catch {
    return NextResponse.json({ error: "Could not create session" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(CUSTOMER_SESSION_COOKIE_NAME, sessionCookie, {
    ...cookieOptions,
    maxAge: CUSTOMER_SESSION_MAX_AGE_MS / 1000,
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(CUSTOMER_SESSION_COOKIE_NAME, "", { ...cookieOptions, maxAge: 0 });
  return res;
}
