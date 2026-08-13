import { NextResponse } from "next/server";
import { getSession } from "@/lib/server/getSession";
import { ONLINE_PAYMENTS_ENABLED, REQUIRE_LOGIN_TO_ORDER } from "@/lib/config/featureFlags";

/**
 * TEMPORARY diagnostic route — admin-only, gated by the same __session
 * cookie the /admin panel itself uses (so it's directly browsable while
 * signed in, no separate token needed). Proves what THIS RUNNING
 * DEPLOYMENT actually has baked in for the two NEXT_PUBLIC_ feature flags,
 * since those are inlined into the compiled output at build time (see
 * lib/config/featureFlags.ts) and setting them in a hosting dashboard has
 * no effect until the next build — this route reads the exact same
 * process.env values and exported constants every gate in the app uses,
 * so its answer can't drift from reality. Razorpay secrets are reported as
 * presence-only booleans, never their values, even though this route is
 * already admin-gated — no reason to make an exception to "never print
 * secrets" for a debug endpoint.
 *
 * DELETE THIS FILE once the live env var problem is confirmed fixed — it
 * has no reason to exist in the app long-term.
 */
export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const onlinePaymentsRaw = process.env.NEXT_PUBLIC_ONLINE_PAYMENTS_ENABLED ?? null;
  const requireLoginRaw = process.env.NEXT_PUBLIC_REQUIRE_LOGIN_TO_ORDER ?? null;

  return NextResponse.json({
    NEXT_PUBLIC_ONLINE_PAYMENTS_ENABLED: {
      rawValue: onlinePaymentsRaw,
      // Computed two ways on purpose: directly from process.env here (===
      // "true"), and via the actual exported constant every real gate in
      // the app imports — if these two ever disagreed, that alone would be
      // a finding. They read the same underlying value, so they should
      // always match.
      computedInline: onlinePaymentsRaw === "true",
      computedFromFeatureFlagsModule: ONLINE_PAYMENTS_ENABLED,
    },
    NEXT_PUBLIC_REQUIRE_LOGIN_TO_ORDER: {
      rawValue: requireLoginRaw,
      computedInline: requireLoginRaw !== "false",
      computedFromFeatureFlagsModule: REQUIRE_LOGIN_TO_ORDER,
    },
    RAZORPAY_KEY_ID: { present: Boolean(process.env.RAZORPAY_KEY_ID) },
    RAZORPAY_KEY_SECRET: { present: Boolean(process.env.RAZORPAY_KEY_SECRET) },
    RAZORPAY_WEBHOOK_SECRET: { present: Boolean(process.env.RAZORPAY_WEBHOOK_SECRET) },
  });
}
