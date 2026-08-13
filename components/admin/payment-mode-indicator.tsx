import { MessageCircle, ShieldCheck } from "lucide-react";
import { ONLINE_PAYMENTS_ENABLED } from "@/lib/config/featureFlags";

/**
 * Reads the SAME build-time-inlined ONLINE_PAYMENTS_ENABLED constant every
 * storefront gate uses (lib/config/featureFlags.ts) — this is what actually
 * shipped in this deployment's JS bundle, not a live Firestore read, so it
 * can never drift from what customers are really seeing. Exists because
 * NEXT_PUBLIC_ vars are inlined at BUILD time: setting them in the hosting
 * dashboard has no effect until the next build, which has been a real
 * source of confusion (a redeploy can silently revert this if the env var
 * isn't saved persistently against the Production environment there) — this
 * banner is the one place to check the actual deployed state instead of
 * guessing from the dashboard config.
 */
export function PaymentModeIndicator({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={`flex max-w-2xl items-center gap-3 rounded-xl border px-4 py-3 text-sm ${
        ONLINE_PAYMENTS_ENABLED
          ? "border-green-500/30 bg-green-500/10 text-green-300"
          : "border-amber-400/30 bg-amber-400/10 text-amber-300"
      }`}
    >
      {ONLINE_PAYMENTS_ENABLED ? (
        <ShieldCheck size={18} className="shrink-0" />
      ) : (
        <MessageCircle size={18} className="shrink-0" />
      )}
      {ONLINE_PAYMENTS_ENABLED ? (
        <span>
          Online payments: <span className="font-semibold">ON</span> — Razorpay checkout is
          live.
        </span>
      ) : (
        <span>
          Online payments: <span className="font-semibold">OFF</span>
          {!compact && (
            <>
              {" "}
              — orders via WhatsApp. Record confirmed orders in{" "}
              <span className="font-medium">WhatsApp Orders</span>.
            </>
          )}
        </span>
      )}
    </div>
  );
}
