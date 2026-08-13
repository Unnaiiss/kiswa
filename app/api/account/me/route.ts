import { NextResponse } from "next/server";
import { getCustomerSession } from "@/lib/server/getCustomerSession";

/** Lets client components (the header's AccountMenu) know whether a
 * customer is signed in, without forcing the (store) layout itself to read
 * cookies() — that would opt EVERY page under it out of static/ISR
 * rendering (getSession()-style cookie reads are a Next.js "dynamic API").
 * Keeping this in its own route lets the storefront shell stay static while
 * only this one small, cheap call is per-request. */
export async function GET() {
  const session = await getCustomerSession();
  return NextResponse.json({
    // uid is included so client-side storage (cart-provider.tsx) can be
    // keyed per-identity rather than one global key shared by every visitor.
    customer: session ? { uid: session.uid, name: session.name, email: session.email } : null,
  });
}
