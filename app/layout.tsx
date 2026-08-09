import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { getSiteSettings } from "@/lib/store/queries";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/$/, "") || undefined;

// A malformed env var (e.g. "kiswaperfumes.in" pasted without the "https://"
// scheme) makes `new URL()` throw synchronously — unlike every Firestore
// read in this file's data fetch, that throw isn't wrapped by anything, and
// generateMetadata runs for EVERY page including /_not-found, so it took
// down the entire build. Resolved once at module scope so a bad value
// degrades to "no metadataBase" instead of crashing every page.
let metadataBase: URL | undefined;
if (SITE_URL) {
  try {
    metadataBase = new URL(SITE_URL);
  } catch (err) {
    console.error(`[layout] NEXT_PUBLIC_SITE_URL is not a valid absolute URL: "${SITE_URL}"`, err);
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const { brandName, tagline, shortDescription } = await getSiteSettings();
  const fullTitle = `${brandName} — ${tagline}`;

  return {
    ...(metadataBase && { metadataBase }),
    title: {
      default: fullTitle,
      template: `%s — ${brandName}`,
    },
    description: shortDescription,
    openGraph: {
      title: fullTitle,
      description: shortDescription,
      siteName: brandName,
      type: "website",
      ...(SITE_URL && { url: SITE_URL }),
    },
    twitter: {
      card: "summary",
      title: fullTitle,
      description: shortDescription,
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
