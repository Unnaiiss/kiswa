"use client";

import { useEffect } from "react";
import Link from "next/link";

// Route-segment error boundary — catches a render/data error anywhere below
// the root layout and shows this instead of a blank white screen. Renders
// inside the root layout's existing <html>/<body>, same as not-found.tsx —
// only global-error.tsx (for a crash in the root layout itself) needs its
// own. Client-side by requirement (Next.js error boundaries must be).
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // No secrets ever reach the client bundle (confirmed in the security
    // audit this fix followed up on), so a plain console.error is safe
    // here — the server-side structured logger (lib/server/logger.ts) is
    // what matters for anything that touched real data.
    console.error("[client error boundary]", error);
  }, [error]);

  return (
    <div className="flex min-h-dvh flex-1 flex-col items-center justify-center gap-4 bg-[#0a0806] px-6 text-center text-[#f1e9dc]">
      <p className="text-xs uppercase tracking-[0.4em] text-[#d4af37]">Something went wrong</p>
      <h1 className="font-serif text-3xl sm:text-4xl">That didn&apos;t work</h1>
      <p className="max-w-sm text-sm text-[#a89a86]">
        An unexpected error occurred. You can try again, or head back to the homepage.
      </p>
      <div className="mt-2 flex gap-3">
        <button
          type="button"
          onClick={reset}
          className="cursor-pointer rounded-full bg-[#d4af37] px-6 py-3 text-sm font-medium tracking-wide text-[#0a0806] transition-colors hover:bg-[#e0c158]"
        >
          Try again
        </button>
        <Link
          href="/"
          className="cursor-pointer rounded-full border border-[#3a3226] px-6 py-3 text-sm font-medium tracking-wide text-[#f1e9dc] transition-colors hover:border-[#d4af37]"
        >
          Back to KISWA
        </Link>
      </div>
    </div>
  );
}
