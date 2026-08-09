import type { NextConfig } from "next";

const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET?.trim();

const nextConfig: NextConfig = {
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
