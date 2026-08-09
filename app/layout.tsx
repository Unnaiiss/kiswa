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

export async function generateMetadata(): Promise<Metadata> {
  const { brandName, tagline, shortDescription } = await getSiteSettings();
  const fullTitle = `${brandName} — ${tagline}`;

  return {
    ...(SITE_URL && { metadataBase: new URL(SITE_URL) }),
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
