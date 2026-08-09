"use client";

import { useEffect } from "react";

// The last-resort boundary — only fires when the ROOT layout itself throws
// (e.g. a bug in app/layout.tsx's generateMetadata, or a render error above
// where app/error.tsx could catch it). Next.js requires this to render its
// OWN complete <html>/<body> since it replaces the root layout entirely —
// unlike not-found.tsx and app/error.tsx, which render inside it. Kept
// deliberately plain (no Tailwind theme classes, no fonts) since we can't
// assume anything the root layout would normally set up actually ran.
export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[global error boundary]", error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          minHeight: "100dvh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1rem",
          padding: "1.5rem",
          textAlign: "center",
          backgroundColor: "#0a0806",
          color: "#f1e9dc",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <p style={{ fontSize: "0.75rem", letterSpacing: "0.3em", textTransform: "uppercase", color: "#d4af37" }}>
          KISWA
        </p>
        <h1 style={{ fontSize: "1.75rem", margin: 0 }}>Something went wrong</h1>
        <p style={{ maxWidth: "24rem", fontSize: "0.875rem", color: "#a89a86" }}>
          Please refresh the page. If this keeps happening, contact us on WhatsApp.
        </p>
        {/* Deliberately a plain <a>, not next/link — this boundary fires when
         * something in the root layout itself broke, so it shouldn't
         * assume Next's router/client runtime is in a healthy state. */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a
          href="/"
          style={{
            marginTop: "0.5rem",
            borderRadius: "9999px",
            backgroundColor: "#d4af37",
            padding: "0.75rem 1.5rem",
            fontSize: "0.875rem",
            fontWeight: 500,
            color: "#0a0806",
            textDecoration: "none",
          }}
        >
          Back to KISWA
        </a>
      </body>
    </html>
  );
}
