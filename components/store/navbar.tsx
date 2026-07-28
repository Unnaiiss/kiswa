"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  Droplet,
  Flower2,
  Mail,
  Menu,
  MessageCircle,
  Search,
  ShoppingBag,
  Sparkles,
  SprayCan,
  Tag,
} from "lucide-react";
import { useCart } from "./cart-provider";
import { NavSearch } from "./nav-search";
import { InstagramIcon } from "./instagram-icon";
import type { StoreProduct } from "@/lib/store/queries";
import { getCategories } from "@/lib/store/categories";
import { WHATSAPP_URL, INSTAGRAM_URL, CONTACT_URL } from "@/lib/store/contact-links";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

interface ShopMenuItem {
  title: string;
  url: string;
  description: string;
  icon: ReactNode;
}

// Free-text category field (set per product in admin) — most known
// categories get a fitting icon, anything else falls back to a plain tag.
const CATEGORY_ICONS: Record<string, ReactNode> = {
  Fragrance: <Flower2 className="size-5 shrink-0" />,
};

function categoryIcon(category: string): ReactNode {
  return CATEGORY_ICONS[category] ?? <Tag className="size-5 shrink-0" />;
}

function buildShopItems(categories: string[]): ShopMenuItem[] {
  return [
    {
      title: "All Perfumes",
      url: "/shop",
      description: "Every KISWA fragrance, oils and sprays, in one place.",
      icon: <Sparkles className="size-5 shrink-0" />,
    },
    {
      title: "Perfume Oils",
      url: "/shop?type=oil",
      description: "Pure concentrated attar, worn undiluted on skin.",
      icon: <Droplet className="size-5 shrink-0" />,
    },
    {
      title: "Perfume Sprays",
      url: "/shop?type=spray",
      description: "The same oils, finished as a fine wearable spray.",
      icon: <SprayCan className="size-5 shrink-0" />,
    },
    ...categories.map((category) => ({
      title: category,
      url: `/shop?category=${encodeURIComponent(category)}`,
      description: `Browse our ${category.toLowerCase()} collection.`,
      icon: categoryIcon(category),
    })),
  ];
}

const MOBILE_CONTACT_LINKS = [
  { label: "Contact", href: CONTACT_URL, icon: <Mail size={18} /> },
  {
    label: "WhatsApp",
    href: WHATSAPP_URL,
    icon: <MessageCircle size={18} />,
    external: true,
  },
  {
    label: "Instagram",
    href: INSTAGRAM_URL,
    icon: <InstagramIcon size={18} />,
    external: true,
  },
];

export function StoreNavbar({ products }: { products: StoreProduct[] }) {
  const { count, open } = useCart();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const shopItems = useMemo(
    () => buildShopItems(getCategories(products)),
    [products],
  );

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 8);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-40 border-b transition-colors duration-300",
        scrolled
          ? "border-kiswa-border/80 bg-kiswa-void/85 backdrop-blur-md"
          : "border-transparent bg-transparent",
      )}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link
          href="/"
          className="font-display text-2xl tracking-[0.3em] text-kiswa-ink transition-colors hover:text-kiswa-gold"
        >
          KISWA
        </Link>

        {/* Desktop menu */}
        <div className="hidden lg:flex">
          <NavigationMenu>
            <NavigationMenuList>
              <NavigationMenuItem>
                <NavigationMenuLink
                  render={<Link href="/" />}
                  className={navigationMenuTriggerStyle()}
                >
                  Home
                </NavigationMenuLink>
              </NavigationMenuItem>

              <NavigationMenuItem>
                <NavigationMenuTrigger>Shop</NavigationMenuTrigger>
                <NavigationMenuContent>
                  <ul className="w-[22rem] p-2">
                    {shopItems.map((item) => (
                      <li key={item.title}>
                        <NavigationMenuLink
                          render={<Link href={item.url} />}
                          className="items-start gap-3"
                        >
                          <span className="mt-0.5 text-kiswa-gold-soft">
                            {item.icon}
                          </span>
                          <span>
                            <span className="block text-sm font-semibold text-kiswa-ink">
                              {item.title}
                            </span>
                            <span className="block text-xs leading-snug text-kiswa-ink-muted">
                              {item.description}
                            </span>
                          </span>
                        </NavigationMenuLink>
                      </li>
                    ))}
                  </ul>
                </NavigationMenuContent>
              </NavigationMenuItem>

              <NavigationMenuItem>
                <NavigationMenuLink
                  render={<Link href="/#our-story" />}
                  className={navigationMenuTriggerStyle()}
                >
                  Our Story
                </NavigationMenuLink>
              </NavigationMenuItem>
            </NavigationMenuList>
          </NavigationMenu>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            aria-label="Search fragrances"
            className="cursor-pointer rounded-full p-2 text-kiswa-ink transition-colors hover:text-kiswa-gold"
          >
            <Search size={20} />
          </button>

          <button
            type="button"
            onClick={open}
            aria-label="Open shopping bag"
            className="relative cursor-pointer rounded-full p-2 text-kiswa-ink transition-colors hover:text-kiswa-gold"
          >
            <ShoppingBag size={22} />
            {count > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-kiswa-gold px-1 text-[10px] font-semibold text-kiswa-void">
                {count}
              </span>
            )}
          </button>

          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger
              aria-label="Open menu"
              className="cursor-pointer rounded-full p-2 text-kiswa-ink transition-colors hover:text-kiswa-gold lg:hidden"
            >
              <Menu size={22} />
            </SheetTrigger>
            <SheetContent
              side="right"
              className="flex flex-col gap-6 overflow-y-auto border-l border-kiswa-border bg-kiswa-void text-kiswa-ink"
            >
              <SheetHeader>
                <SheetTitle className="font-display text-lg tracking-[0.3em] text-kiswa-ink">
                  KISWA
                </SheetTitle>
              </SheetHeader>

              <nav className="flex flex-col gap-2 px-4">
                <Link
                  href="/"
                  onClick={() => setMobileOpen(false)}
                  className="rounded-lg px-2 py-3 text-base font-semibold tracking-wide text-kiswa-ink transition-colors hover:bg-kiswa-surface hover:text-kiswa-gold"
                >
                  Home
                </Link>

                <Accordion>
                  <AccordionItem value="shop" className="border-kiswa-border">
                    <AccordionTrigger className="px-2 text-base font-semibold text-kiswa-ink hover:text-kiswa-gold hover:no-underline">
                      Shop
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="flex flex-col gap-1">
                        {shopItems.map((item) => (
                          <Link
                            key={item.title}
                            href={item.url}
                            onClick={() => setMobileOpen(false)}
                            className="flex items-start gap-3 rounded-lg p-2 transition-colors hover:bg-kiswa-surface"
                          >
                            <span className="mt-0.5 text-kiswa-gold-soft">
                              {item.icon}
                            </span>
                            <span>
                              <span className="block text-sm font-medium text-kiswa-ink">
                                {item.title}
                              </span>
                              <span className="block text-xs leading-snug text-kiswa-ink-muted">
                                {item.description}
                              </span>
                            </span>
                          </Link>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>

                <Link
                  href="/#our-story"
                  onClick={() => setMobileOpen(false)}
                  className="rounded-lg px-2 py-3 text-base font-semibold tracking-wide text-kiswa-ink transition-colors hover:bg-kiswa-surface hover:text-kiswa-gold"
                >
                  Our Story
                </Link>

                <div className="mt-4 flex flex-col gap-1 border-t border-kiswa-border pt-4">
                  {MOBILE_CONTACT_LINKS.map((link) => (
                    <a
                      key={link.label}
                      href={link.href}
                      target={link.external ? "_blank" : undefined}
                      rel={link.external ? "noopener noreferrer" : undefined}
                      className="flex items-center gap-3 rounded-lg px-2 py-3 text-sm text-kiswa-ink-muted transition-colors hover:bg-kiswa-surface hover:text-kiswa-gold"
                    >
                      {link.icon}
                      {link.label}
                    </a>
                  ))}
                </div>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      <NavSearch
        products={products}
        open={searchOpen}
        onOpenChange={setSearchOpen}
      />
    </header>
  );
}
