import { AlertTriangle } from "lucide-react";

/**
 * Every admin data hook (lib/admin/use*.ts) now surfaces its onSnapshot
 * error instead of swallowing it — this is the one place that error gets
 * rendered, so an admin never mistakes "Firestore denied this read" (e.g.
 * the client-side Firebase Auth session desyncing from the server session
 * cookie — the two are independently established, see lib/firebase/
 * useAuthReady.ts) for "there's genuinely no data here." Deliberately loud
 * (red, an icon, actionable copy) rather than a quiet inline note, since a
 * quiet failure here is exactly what looked like data loss before this.
 */
export function QueryErrorBanner({ error }: { error: string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
      <AlertTriangle size={18} className="mt-0.5 shrink-0" />
      <div>
        <p className="font-medium">Couldn&apos;t load this data.</p>
        <p className="mt-0.5 text-red-300/80">
          {error} This usually means your session lost access — try signing out and back in.
          If it persists, check the browser console for the exact Firestore error.
        </p>
      </div>
    </div>
  );
}
