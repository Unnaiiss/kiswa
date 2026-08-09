import Link from "next/link";

// Renders inside the root layout's existing <html>/<body> (app/layout.tsx)
// — this file must NOT define its own, unlike global-error.tsx, which
// replaces the root layout entirely and has no choice but to.
export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-1 flex-col items-center justify-center gap-4 bg-[#0a0806] px-6 text-center text-[#f1e9dc]">
      <p className="text-xs uppercase tracking-[0.4em] text-[#d4af37]">404</p>
      <h1 className="font-serif text-3xl sm:text-4xl">This page has drifted away</h1>
      <p className="max-w-sm text-sm text-[#a89a86]">
        The page you&apos;re looking for doesn&apos;t exist, or may have moved.
      </p>
      <Link
        href="/"
        className="mt-2 rounded-full bg-[#d4af37] px-6 py-3 text-sm font-medium tracking-wide text-[#0a0806] transition-colors hover:bg-[#e0c158]"
      >
        Back to KISWA
      </Link>
    </div>
  );
}
