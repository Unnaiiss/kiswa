import type { NextConfig } from "next";

const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET?.trim();

const nextConfig: NextConfig = {
  // firebase-admin -> jwks-rsa -> jose@6 is ESM-only (no CJS export at all).
  // Next.js otherwise leaves that chain as a raw, un-bundled node_modules
  // file that Vercel's serverless function tries to `require()` at runtime,
  // which throws "require() of ES Module ... not supported" the moment any
  // route touches lib/firebase/admin.ts (i.e. almost every dynamic route) —
  // this forces webpack to actually bundle it, resolving the ESM import
  // properly instead of leaving Node's CJS loader to choke on it.
  transpilePackages: ["jose", "jwks-rsa"],
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
