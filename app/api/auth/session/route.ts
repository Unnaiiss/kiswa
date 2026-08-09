import { NextResponse } from "next/server";
import { z } from "zod";
import {
  createSessionCookie,
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_MS,
} from "@/lib/server/sessionCookie";
import { rateLimit } from "@/lib/server/rateLimit";

const bodySchema = z.object({ idToken: z.string().min(1) });

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};

export async function POST(request: Request) {
  // Public + unauthenticated by design (this is the login step itself —
  // it mints a cookie from an idToken Firebase Auth already verified
  // client-side). Firebase Auth has its own backend abuse protection on
  // password sign-in, but this adds defense-in-depth against cookie-mint
  // spam specifically.
  const limited = rateLimit(request, "auth:session", {
    limit: 15,
    windowMs: 10 * 60 * 1000,
  });
  if (limited) return limited;

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  let sessionCookie: string;
  try {
    sessionCookie = await createSessionCookie(parsed.data.idToken);
  } catch {
    return NextResponse.json(
      { error: "Could not create session" },
      { status: 401 },
    );
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE_NAME, sessionCookie, {
    ...cookieOptions,
    maxAge: SESSION_MAX_AGE_MS / 1000,
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE_NAME, "", { ...cookieOptions, maxAge: 0 });
  return res;
}
