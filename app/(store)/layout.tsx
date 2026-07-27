import { Inter, Playfair_Display } from "next/font/google";
import { CartProvider } from "@/components/store/cart-provider";
import { CartDrawer } from "@/components/store/cart-drawer";
import { StoreNavbar } from "@/components/store/navbar";
import { StoreFooter } from "@/components/store/footer";

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export default function StoreLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div
      className={`${playfair.variable} ${inter.variable} flex flex-1 flex-col bg-kiswa-void font-body text-kiswa-ink`}
    >
      <CartProvider>
        <StoreNavbar />
        {children}
        <StoreFooter />
        <CartDrawer />
      </CartProvider>
    </div>
  );
}
