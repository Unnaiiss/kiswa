# KISWA — UI Redesign Brief

A reference for redesigning the interface. This is deliberately UI/UX-focused — for backend/business-logic rules (stock model, checkout, order fulfillment, security), see `CLAUDE.md` in the project root; this file exists so a designer or a redesign pass doesn't have to read that whole document to understand what screens exist and how they're currently built.

## 1. What this product is

KISWA is a production attar/perfume business running **three separate interfaces in one Next.js app**, each with its own audience and its own current visual language:

| App | URL | Audience | Device | Current feel |
|---|---|---|---|---|
| **Storefront** | `/` and everything in the `(store)` route group | Customers, India, mobile-heavy traffic | Phone-first, browsed casually | Luxury: dark charcoal + gold, serif display type, slow reveal animations |
| **POS** | `/pos` | Shop staff, at a physical counter | Tablet/phone, used all day | Utility: dark, big touch targets, minimal taps per bill |
| **Admin** | `/admin` | Owner/staff managing the business | Desktop mostly, some mobile | Utility: dark dashboard, dense tables, zinc/amber palette |

Currency is always ₹ (INR). There is no real brand logo asset yet (favicon is the stock Next.js one) and no real product photography seeded yet — `ProductImage` falls back to an icon placeholder wherever a photo is missing. Both are worth flagging to whoever's redesigning: a new visual identity will likely want to fix both.

## 2. Tech stack (what a redesign has to work within, or can deliberately replace)

- **Next.js 15** (App Router), **React 19**, **TypeScript strict**.
- **Tailwind CSS v4** — utility-first, no separate CSS-in-JS. Custom design tokens are declared via `@theme`/`@theme inline` blocks in `app/globals.css` (see §3).
- **shadcn/ui** (built on `@base-ui/react` primitives, not Radix) for base interactive components — `components/ui/*` (button, dialog, sheet, command palette, input, textarea, carousel wrapper). These are the *only* generic/unstyled building blocks; everything else in `components/store`, `components/admin`, `components/pos`, `components/account` is bespoke.
- **Framer Motion** for storefront animation (reveal-on-scroll, tilt cards).
- **embla-carousel-react** + **embla-carousel-autoplay** for every carousel (homepage banner, Featured Fragrances rail).
- **lucide-react** for all icons (no custom icon set except a handful of brand social icons — `facebook-icon.tsx`, `instagram-icon.tsx`, `whatsapp-icon.tsx`, `youtube-icon.tsx` — and one favicon).
- **recharts** for admin's sales chart.
- **cmdk** for the storefront's nav search command palette.
- Fonts: **Playfair Display** (display/heading serif, `--font-playfair`, `font-display`) + **Inter** (body, `--font-inter`, `font-body`) on the storefront — both loaded via `next/font/google` in the `(store)` layout. Admin/POS/auth pages use the system default sans (no serif, purely utilitarian).

A redesign can keep this stack (Tailwind v4 tokens + shadcn primitives make broad restyling relatively cheap — see the theme system below as proof) or replace individual pieces (e.g. swap Framer Motion, swap the carousel library) without touching business logic, since none of the above leak into `lib/`/`app/api/` server code at all.

## 3. Current design system

### 3.1 Storefront palette — "dark + gold luxury", now with a light variant

Defined as CSS custom properties in `app/globals.css`, exposed as Tailwind utilities (`bg-kiswa-void`, `text-kiswa-ink`, etc.):

| Token | Dark (default) | Light (opt-in) | Role |
|---|---|---|---|
| `kiswa-void` | `#0c0a09` | `#faf7f0` | Page background |
| `kiswa-surface` | `#17130e` | `#f2ebdc` | Card/panel background |
| `kiswa-surface-2` | `#201a12` | `#ece2cb` | Nested panel |
| `kiswa-border` | `#2b241a` | `#e2d4b0` | Hairline borders |
| `kiswa-ink` | `#f6f1e6` | `#241a10` | Primary text |
| `kiswa-ink-muted` | `#a99a83` | `#7d6c52` | Secondary text |
| `kiswa-gold` | `#d4af37` | `#a67c22` | Primary accent |
| `kiswa-gold-soft` | `#e8c96a` | `#c69a3f` | Hover/emphasis gold |
| `kiswa-gold-dim` | `#8a6d28` | `#cdb488` | Disabled/dim gold |
| `kiswa-maroon` | `#4a1220` | `#4a1220` (constant) | Accent block (e.g. announcement bar default) |

A light/dark toggle exists (see §7) but **dark is the default everywhere** and is what most visitors will actually see first. A redesign that touches color should treat dark as the primary design target, light as a secondary pass.

### 3.2 Admin/POS palette — Tailwind's stock zinc scale + amber accent

No custom tokens — admin/POS use vanilla Tailwind `zinc-50` through `zinc-950` for the whole UI (backgrounds, borders, text, at every level of the hierarchy) plus `amber-400` as the single accent color (active nav item, primary buttons, focus rings, brand wordmark). This is a completely different visual language from the storefront — flat, dense, dashboard-like, zero serif/display type, zero motion beyond basic hover/transition-colors. `bg-canvas` is one custom exception — a token introduced specifically so the "darkest page backdrop" role could theme-flip independently of `zinc-950` (which is also used, unrelated to backgrounds, as fixed dark text on gold buttons). If a redesign gives admin/POS their own distinct identity rather than reusing raw Tailwind grays, this `canvas` token is the one existing indirection point to build on.

### 3.3 Layout conventions

- Mobile-first throughout; storefront breakpoints follow Tailwind defaults (sm/md/lg/xl).
- Storefront content is generally capped at `max-w-6xl` and centered, with `px-4`/`px-6` side gutters.
- Admin uses a persistent left sidebar (desktop) that collapses to a slide-in drawer + top bar (mobile) — `components/admin/admin-shell.tsx`.
- POS is a single full-height screen (`h-dvh`) split into a product grid + a bill panel, with a bottom sheet on mobile for the bill (`components/pos/billing-screen.tsx`).
- Radius scale, shadows, spacing all come from Tailwind defaults plus a few custom `--radius-*`/`--spacing-nav` tokens in `globals.css` — nothing bespoke beyond that.

### 3.4 Motion

- Storefront: `components/store/reveal.tsx` (fade/slide-up on scroll into view) wraps almost every section heading and card grid; `components/ui/tilt-card.tsx` gives product cards a subtle 3D tilt-on-hover (touch-safe — degrades to no-op on touch devices); the homepage banner and Featured Fragrances rail auto-play (embla-autoplay, ~3.2s interval, pauses on hover/interaction, loops).
- Admin/POS: essentially no motion beyond Tailwind's `transition-colors` on hover/focus states. This is a deliberate utility-tool feel, not an oversight — but also an obvious place a redesign could add polish without hurting task speed.

## 4. Full route map

### Storefront (public, `(store)` route group — dark+gold theme, header+footer+cart drawer+WhatsApp float button wrap everything)

| Route | Purpose | Key components |
|---|---|---|
| `/` | Homepage | `BannerCarousel` → `FeaturedProducts` (auto-sliding rail) → `GiftSection` → `OurStory` (two cards) → `ImportedPerfumesSection` |
| `/shop` | Full catalog, filterable (fragrance type: oil/spray/imported) | `ShopGrid`, `ProductCard`, `TiltCard` |
| `/product/[slug]` | Single fragrance detail | `ProductGallery`, `VariantSelector` (attar: oil/spray + size picker) or `ImportedBuyBox` (imported: qty stepper only), `FragranceNotes`, `GiftDialog` |
| `/offers` | Combo/bundle listing | `ComboCard` grid |
| `/offers/[slug]` | Single combo detail | `ComboPicker` (choose-any) or `ComboAddFixed` |
| `/gift` | Gift-focused landing/shop page | `GiftShopGrid` |
| `/checkout` | Cart → order (guest-first, see §7) | `CheckoutForm` (guest details form, `AddressPicker` for signed-in customers, Razorpay/COD buttons) |
| `/checkout/success` | Order confirmation | `OrderInvoice`, guest order-link callout, "create an account" prompt |
| `/orders/[token]` | Guest order tracking (no login, capability URL) | `OrderInvoice`, `DeliveryTimeline`, `OrderStatusBadge` |
| `/track` | Guest lookup by invoice # + phone (no token needed) | `TrackForm` |
| `/account`, `/account/orders[, /id]`, `/account/addresses` | Signed-in customer dashboard | `AccountNav` tabs, `AddressList`/`AddressForm`, `DeliveryTimeline`, `OrderInvoice` |
| `/account/login`, `/account/signup`, `/account/forgot-password` | Customer auth (standalone, full-screen, NOT inside the store header/footer) | `AccountLoginForm`, `AccountSignupForm`, `GoogleSigninButton`, `AccountForgotPasswordForm` |

### Admin (`/admin`, admin-only auth, sidebar shell)

| Route | Purpose |
|---|---|
| `/admin` | Dashboard — stat cards, sales chart, "orders needing action" panel |
| `/admin/products` | Product catalog CRUD (attar/imported), image gallery uploader |
| `/admin/banners` | Homepage poster carousel management |
| `/admin/home-sections` | Announcement bar, brand settings, gift/our-story/imported-section copy+images, checkout settings, notification settings |
| `/admin/combos` | Combo/bundle offer CRUD |
| `/admin/whatsapp-orders` | Manual re-key screen (guest WhatsApp orders) + live pending-drafts panel (logged-in-customer WhatsApp drafts) |
| `/admin/stock` | Stock In / Adjustment / Set-exact-stock, movement history |
| `/admin/sales` | Order/fulfillment management — filters, bulk status actions, per-order detail panel |
| `/admin/sales/[id]/packing-slip` | Printable packing slip (A4/thermal toggle) |
| `/admin/sales/[id]/gift-card` | Printable gift card insert |
| `/admin/reports` | Revenue/channel/product-type/oil-usage/payment/refund tables and splits |
| `/admin/customers/[uid]` | Individual customer profile (lifetime orders/spend) |

### POS (`/pos`, staff-only auth)

Single-page app: product grid (tap to add) + combo tiles + bill panel + variant/combo picker sheets → `ReceiptScreen` (printable 80mm thermal receipt) on completion.

### Standalone

- `/login` — staff/admin sign-in (shared by both `/admin` and `/pos`, same dark utility styling as those two).

## 5. Component inventory (for scoping a redesign)

Counts as of this writing — useful for estimating how much surface a full visual overhaul touches:

- `components/store/` — **41 files** (product display, cart, checkout, account-adjacent bits like the account menu, WhatsApp CTAs, announcement bar, footer/header).
- `components/account/` — **11 files** (auth forms, address book, order status/timeline — shared between the customer dashboard and the guest `/orders/[token]` page).
- `components/admin/` — **~30 files** across 8 subfolders (banners, combos, dashboard, home-sections, products, reports, sales, stock, whatsapp-orders) plus `admin-shell.tsx`/`modal.tsx`.
- `components/pos/` — **8 files**.
- `components/ui/` — **12 files** (shadcn primitives + a few bespoke ones: `flow-button`, `tilt-card`, `reveal-text`, `blur-text`).
- `components/auth/` — **1 file** (the shared staff/admin login form).

Roughly **~103 component files** total. The storefront and admin/POS are visually and structurally independent enough that they could be redesigned on separate timelines without blocking each other.

## 6. Shared/reused-verbatim components (redesign these once, get multiple screens for free)

The codebase deliberately shares several components between what would otherwise be near-duplicate screens — worth knowing before touching any one of them, since a change ripples to every listed call site:

- **`OrderInvoice`** (`components/store/order-invoice.tsx`) — identical on the Razorpay/COD checkout success page, `/account/orders/[id]`, and the guest `/orders/[token]` page.
- **`DeliveryTimeline`** (`components/account/delivery-timeline.tsx`) — identical on `/account/orders/[id]` and `/orders/[token]`.
- **`OrderStatusBadge`** — same status-pill styling used in the customer-facing order pages and admin's Sales table/detail.
- **`ContactBlock`/`SocialIconsRow`** (`components/store/contact-block.tsx`) — the real footer and the admin Brand Settings form's live preview render the exact same component, so "what the admin sees while editing" never drifts from "what's actually live."
- **`AnnouncementBarVisual`** — same relationship: real marquee and its admin-form preview are one component.
- **Product grid/bill building blocks** (`ProductGrid`, `BillPanel`, `ComboTile`, the variant/combo picker sheets) — shared between `/pos` and Admin's WhatsApp Orders manual re-key screen.

## 7. Key UX flows worth understanding before redesigning

**Storefront browsing → purchase**: Home → product/shop/offers → Add to Bag or "Order on WhatsApp" (a human-handoff enquiry, always available) → cart drawer → checkout. Checkout is **guest-first with no interstitial** — a signed-out visitor lands straight on a details form (name/phone/email/address), with a small "Sign in instead" link for anyone who wants to reuse a saved address. Payment is Razorpay (UPI/cards/netbanking/wallets) or Cash on Delivery (toggle-able). A guest gets a durable, no-login order-tracking link after purchase; a signed-in customer sees the order in their account immediately.

**POS billing**: staff logs in → taps products/combos onto a running bill → adjusts qty/gift-wrap inline → "Complete Bill" → printable receipt. Optimized purely for speed — minimal taps, big touch targets, no confirmation dialogs beyond what's strictly necessary.

**Admin order fulfillment**: Sales screen lists every order (online + POS) with status filters and bulk actions → opening one order shows a status-history timeline, courier/tracking entry, and (for cancel/return) an inline "this will restore exactly X stock" preview before committing.

None of these flows *require* changing for a visual redesign, but they constrain it: e.g. checkout's guest form must stay short/low-friction (it was explicitly simplified from a 3-way chooser to a single form for exactly this reason), and POS screens must keep large, thumb-reachable tap targets regardless of new visual style.

## 8. The theme system (relevant if the redesign includes new colors)

A light/dark toggle already exists sitewide (storefront header, admin sidebar, POS header — not on the standalone staff login page). It's implemented as a **pure CSS-variable swap** in `app/globals.css`: every `kiswa-*`, `zinc-*`, and `amber-400` utility class resolves to a variable that's redefined under `:root` (light) vs `.dark` (dark, the default). This means:

- **A new color palette can be dropped in by editing `app/globals.css` alone** — no need to touch the ~100 component files that reference `bg-kiswa-void`/`text-zinc-50`/etc., as long as the new palette keeps the same *token names* (`kiswa-void`, `kiswa-ink`, `kiswa-gold`, etc. for storefront; the zinc scale + `amber-400` + `canvas` for admin/POS).
- If a redesign wants **new token names** (e.g. retiring "kiswa-*" for a new brand system), that's a larger, deliberate rename across every storefront component — still mechanical (find/replace per token), just not free the way a same-name palette swap is.
- The two zinc shades excluded from theme-flipping (`zinc-500`, `zinc-950`) are excluded for a specific reason (see `CLAUDE.md`'s "Light/dark theme" section) — a redesign that introduces genuinely new admin/POS tokens should design that constraint away rather than inherit it.

## 9. Known gaps / open questions for a redesign to address

- **No real logo.** Only the stock Next.js favicon exists; the JSON-LD structured data deliberately omits `logo` rather than pointing at a placeholder. A redesign should produce a real mark.
- **No real product photography yet.** `ProductImage`/the Our Story cards fall back to icon placeholders. Visual design work (card layouts, gallery treatments, hero imagery) is currently being evaluated against placeholders, not real fragrance photography — worth sourcing/shooting before finalizing image-heavy layouts.
- **Three distinct visual languages, by design** (luxury storefront vs. utility admin vs. utility POS). A redesign should decide deliberately whether to keep them distinct (current approach) or unify them under one system — this is a strategic call, not a technical constraint either way.
- **Admin/POS currently has near-zero motion/polish** compared to the storefront — an intentional "speed over delight" choice for a working tool, but one a redesign might reconsider now that the underlying design-token infrastructure (see §8) makes theming/restyling cheap.
- **Print layouts exist and are load-bearing**: the customer invoice, POS thermal receipt, admin packing slip (A4 + 80mm thermal variants), and gift card insert all have dedicated print CSS (`app/globals.css`'s `@media print` block, keyed by element id). Any redesign of these specific components needs to preserve/redo that print styling, not just the on-screen view.
