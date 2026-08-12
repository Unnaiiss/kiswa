import { NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase/admin";
import { createCustomerOnSignup } from "@/lib/server/customers";
import { signupBodySchema } from "@/lib/auth/customerValidation";
import { rateLimit } from "@/lib/server/rateLimit";

/**
 * Creates the Firebase Auth user SERVER-SIDE (via adminAuth.createUser),
 * deliberately not trusting a client-side createUserWithEmailAndPassword
 * call — that's the only way the password policy in customerValidation.ts
 * is genuinely enforced rather than just suggested: a password that never
 * reaches this route can't be validated by it. Returns a custom token
 * rather than minting the session cookie directly, since session cookies
 * can only be created from a real ID token — the client exchanges this for
 * one via signInWithCustomToken, then calls /api/account/session (the same
 * route login/Google use) to actually establish the session.
 */
export async function POST(request: Request) {
  const limited = rateLimit(request, "account:signup", {
    limit: 10,
    windowMs: 10 * 60 * 1000,
  });
  if (limited) return limited;

  const json = await request.json().catch(() => null);
  const parsed = signupBodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 },
    );
  }

  const { email, password, name, phone, marketingOptIn } = parsed.data;

  let uid: string;
  try {
    const created = await adminAuth.createUser({
      email,
      password,
      displayName: name,
    });
    uid = created.uid;
  } catch (err) {
    const code = (err as { code?: string } | null)?.code;
    if (code === "auth/email-already-exists") {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 409 },
      );
    }
    if (code === "auth/invalid-password" || code === "auth/invalid-email") {
      return NextResponse.json({ error: "Please check your details and try again." }, { status: 400 });
    }
    return NextResponse.json({ error: "Couldn't create your account. Please try again." }, { status: 500 });
  }

  await createCustomerOnSignup({ uid, email, name, phone: phone ?? null, marketingOptIn });

  const customToken = await adminAuth.createCustomToken(uid);
  return NextResponse.json({ ok: true, customToken });
}
