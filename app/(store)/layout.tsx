import { Inter, Playfair_Display } from "next/font/google";
import { CartProvider } from "@/components/store/cart-provider";
import { CartDrawer } from "@/components/store/cart-drawer";
import { StoreHeader } from "@/components/store/header";
import { StoreFooter } from "@/components/store/footer";
import { WhatsAppFloatButton } from "@/components/store/whatsapp-float-button";
import { SiteSettingsProvider } from "@/lib/store/site-settings-context";
import { getActiveProducts, getAnnouncementBar, getSiteSettings } from "@/lib/store/queries";

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const revalidate = 60;

export default async function StoreLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [products, announcementBar, siteSettings] = await Promise.all([
    getActiveProducts(),
    getAnnouncementBar(),
    getSiteSettings(),
  ]);

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/$/, "") || undefined;
  const organizationJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: siteSettings.brandName,
    ...(siteUrl && { url: siteUrl }),
    ...(siteSettings.email && { email: siteSettings.email }),
    ...(siteSettings.instagramUrl && { sameAs: [siteSettings.instagramUrl] }),
    address: {
      "@type": "PostalAddress",
      addressLocality: "Ponoor",
      addressRegion: "Kerala",
      addressCountry: "IN",
    },
  };

  return (
    <div
      className={`${playfair.variable} ${inter.variable} flex flex-1 flex-col bg-kiswa-void font-body text-kiswa-ink`}
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
      />
      <SiteSettingsProvider settings={siteSettings}>
        <CartProvider>
          <StoreHeader products={products} announcementBar={announcementBar} />
          <div className="flex flex-1 flex-col">{children}</div>
          <StoreFooter />
          <CartDrawer />
          <WhatsAppFloatButton />
        </CartProvider>
      </SiteSettingsProvider>
    </div>
  );
}
