Project: KISWA — Attar / Perfume Store

Production e-commerce + offline POS billing + unified admin panel. Currency: INR (₹). Market: India. Mobile-first. Backend: Firebase.

Three apps in one Next.js project
Storefront (public, route group (store)): luxury feel, dark + gold theme, smooth Framer Motion animations, fast, SEO-friendly.
POS at /pos (staff login): fast tablet/phone billing screen for the physical shop. Big touch targets, minimal taps per bill.
Admin at /admin (admin login): dashboard, products, stock, sales, reports across BOTH channels.
Inventory model: BULK OIL, not per-variant bottle counts
Every variant of a fragrance (every oil size AND every spray size) is bottled from that fragrance's single shared attar oil pool — there is no independent stock per bottle size. Each product has ONE oilStockMl (decimals allowed) and one lowStockThresholdMl (default 10). Each variant has oilMlPerUnit: how many ml of that shared pool one unit of that variant consumes. Defaults: Oil 3ml=3, Oil 6ml=6, Oil 12ml=12, Spray 20ml=2.4, Spray 50ml=6, Spray 100ml=12 — editable per variant in admin. A variant is purchasable only while oilStockMl >= its oilMlPerUnit; the max qty addable (storefront cart or POS bill) is floor(remaining oilStockMl / oilMlPerUnit), where "remaining" nets out oil already committed to OTHER lines of the same product in that same cart/bill (they all draw from one pool).
Firestore data model
products/{id} (id = slug): name, slug, description, notes (fragrance notes), category, imageUrls[], isActive, oilStockMl, lowStockThresholdMl, variants[] (embedded array: variantId, type ('oil' | 'spray'), sizeMl, priceInr, mrpInr, oilMlPerUnit, isActive), createdAt. `oilStockMl` is the ONLY stock number for the product — it may ONLY be changed inside the recordSale/stockIn/stockAdjust transactions below, never edited directly. Every fragrance has exactly six variants: Oil 3ml/6ml/12ml, Spray 20ml/50ml/100ml.
stockMovements/{id}: productId, productName, variantId (nullable — set only for sale-driven line items, null for product-level Stock In/Adjustment/Set-exact-stock), variantLabel (nullable, snapshot like "Oil 3ml"), mlChange (+/-, ml of oil), reason ('opening_stock' | 'purchase' | 'online_sale' | 'offline_sale' | 'adjustment' | 'return'), referenceId (saleId if any), note, createdAt. Every stock change writes a movement — this is the audit trail.
sales/{id}: channel ('online' | 'offline'), invoiceNo (unique, 'KSW-YYYY-NNNN'), customerName, customerPhone, items[] (embedded array: productId, productName, variantId, sizeMl, unitPrice, qty, lineTotal, mlUsed — oilMlPerUnit*qty snapshotted at sale time, since oilMlPerUnit is editable and historical reports must not shift when it changes), subtotal, discount, total, paymentMethod ('razorpay' | 'cash' | 'upi' | 'card'), paymentStatus, razorpayOrderId, razorpayPaymentId, orderStatus ('pending' | 'paid' | 'packed' | 'shipped' | 'delivered' | 'cancelled'), shippingAddress (map, online only), createdByUid, createdAt.
counters/invoices: { year, seq } — incremented inside the same transaction.
users/{uid}: role ('admin' | 'staff'), name. Role is ALSO set as a Firebase Auth custom claim; security rules check the claim.
Critical business rules
recordSale(...) lives in server code (lib/) using firebase-admin and a Firestore transaction: read all product docs and the invoice counter first, sum ml needed per PRODUCT (qty * oilMlPerUnit across every item of that product in the sale, since its variants share one pool), verify oilStockMl >= ml needed for every product (throw if not — overselling must be impossible), then deduct oilStockMl once per product, write one stockMovement per line item (in ml, negative, with variantId + variantLabel), increment the invoice counter, and create the sale doc. All in ONE transaction (all reads before writes, per Firestore rules).
Online: recordSale runs ONLY after Razorpay signature verification server-side. Razorpay webhook route as backup confirmation.
Offline POS: recordSale runs when staff presses "Complete Bill".
ALL writes go through Next.js API routes using firebase-admin (which bypasses security rules). Firestore security rules therefore DENY all client writes; clients may read: active products (public), and sales/stockMovements/users only with admin or staff custom claims.
Secrets (service account JSON, Razorpay secret, webhook secret) are server-side env vars only. Client gets only NEXT_PUBLIC_ Firebase config.
Admin dashboard uses Firestore onSnapshot for live updates.
Maintain firestore.rules and firestore.indexes.json in the repo and deploy them (via the Firebase MCP or firebase CLI) whenever queries change.
Code style
TypeScript strict. Server components by default. Zod validation on every API input. Typed Firestore converters for every collection.
Write a test (or verifiable script) proving oversell is rejected.
