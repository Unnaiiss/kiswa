import { Inter, Playfair_Display } from "next/font/google";
import { CartProvider } from "@/components/store/cart-provider";
import { CartDrawer } from "@/components/store/cart-drawer";
import { StoreHeader } from "@/components/store/header";
import { StoreFooter } from "@/components/store/footer";
import { WhatsAppFloatButton } from "@/components/store/whatsapp-float-button";
import { getActiveProducts } from "@/lib/store/queries";

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
  const products = await getActiveProducts();

  return (
    <div
      className={`${playfair.variable} ${inter.variable} flex flex-1 flex-col bg-kiswa-void font-body text-kiswa-ink`}
    >
      <CartProvider>
        <StoreHeader products={products} />
        <div className="flex flex-1 flex-col">{children}</div>
        <StoreFooter />
        <CartDrawer />
        <WhatsAppFloatButton />
      </CartProvider>
    </div>
  );
}
