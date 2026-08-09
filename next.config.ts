import type { NextConfig } from "next";

const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET?.trim();

const nextConfig: NextConfig = {
  // firebase-admin -> jwks-rsa -> jose@6 is ESM-only (no CJS export at all).
  // firebase-admin itself is on Next.js's own default serverExternalPackages
  // list (node_modules/next/dist/lib/server-external-packages.json), which
  // means webpack never bundles ANY of it — including its internal
  // require("jwks-rsa") -> require("jose") calls — so listing just jose/
  // jwks-rsa here was not enough; those are only ever reached through
  // firebase-admin's own unbundled code, which webpack never touches.
  // firebase-admin must be listed here too: Next's webpack config computes
  // the external list as (defaults + serverExternalPackages) MINUS anything
  // in transpilePackages, so this is what actually pulls the whole chain
  // into webpack's bundle instead of leaving Node's runtime `require()` to
  // choke on jose's pure-ESM output (confirmed via a real production crash:
  // "require() of ES Module .../jose/dist/webapi/index.js ... not
  // supported", thrown on every route that touches lib/firebase/admin.ts).
  transpilePackages: ["firebase-admin", "jose", "jwks-rsa"],
  images: {
    // Scoped to exactly our own Firebase Storage bucket's download-URL path
    // (lib/server/imageStorage.ts) — deliberately not a wildcard host, so
    // next/image's optimizer can only ever fetch from our own bucket, never
    // an arbitrary external URL an admin might paste in elsewhere.
    ...(storageBucket && {
      remotePatterns: [
        {
          protocol: "https",
          hostname: "firebasestorage.googleapis.com",
          pathname: `/v0/b/${storageBucket}/o/**`,
        },
      ],
    }),
  },
};

export default nextConfig;
