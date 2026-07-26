Project: KISWA — Attar / Perfume Store

Production e-commerce + offline POS billing + unified admin panel. Currency: INR (₹). Market: India. Mobile-first. Backend: Firebase.

Three apps in one Next.js project
Storefront (public, route group (store)): luxury feel, dark + gold theme, smooth Framer Motion animations, fast, SEO-friendly.
POS at /pos (staff login): fast tablet/phone billing screen for the physical shop. Big touch targets, minimal taps per bill.
Admin at /admin (admin login): dashboard, products, stock, sales, reports across BOTH channels.
Firestore data model
products/{id} (id = slug): name, slug, description, notes (fragrance notes), category, imageUrls[], isActive, variants[] (embedded array: variantId, type ('oil' | 'spray'), sizeMl, priceInr, mrpInr, stock, lowStockThreshold), createdAt. Each variant's `stock` is the live stock for that variant — it may ONLY be changed inside the recordSale/stockIn/stockAdjust transactions below, never edited directly. Every fragrance has exactly six variants: Oil 3ml/6ml/12ml, Spray 20ml/50ml/100ml.
stockMovements/{id}: productId, productName, variantId, sizeMl, qtyChange (+/-), reason ('opening_stock' | 'purchase' | 'online_sale' | 'offline_sale' | 'adjustment' | 'return'), referenceId (saleId if any), note, createdAt. Every stock change writes a movement — this is the audit trail.
sales/{id}: channel ('online' | 'offline'), invoiceNo (unique, 'KSW-YYYY-NNNN'), customerName, customerPhone, items[] (embedded array: productId, productName, variantId, sizeMl, unitPrice, qty, lineTotal), subtotal, discount, total, paymentMethod ('razorpay' | 'cash' | 'upi' | 'card'), paymentStatus, razorpayOrderId, razorpayPaymentId, orderStatus ('pending' | 'paid' | 'packed' | 'shipped' | 'delivered' | 'cancelled'), shippingAddress (map, online only), createdByUid, createdAt.
counters/invoices: { year, seq } — incremented inside the same transaction.
users/{uid}: role ('admin' | 'staff'), name. Role is ALSO set as a Firebase Auth custom claim; security rules check the claim.
Critical business rules
recordSale(...) lives in server code (lib/) using firebase-admin and a Firestore transaction: read all product docs and the invoice counter first, verify stock >= qty for every (productId, variantId) pair (throw if not — overselling must be impossible), then decrement each variant's stock, write one stockMovement per item, increment the invoice counter, and create the sale doc. All in ONE transaction (all reads before writes, per Firestore rules).
Online: recordSale runs ONLY after Razorpay signature verification server-side. Razorpay webhook route as backup confirmation.
Offline POS: recordSale runs when staff presses "Complete Bill".
ALL writes go through Next.js API routes using firebase-admin (which bypasses security rules). Firestore security rules therefore DENY all client writes; clients may read: active products (public), and sales/stockMovements/users only with admin or staff custom claims.
Secrets (service account JSON, Razorpay secret, webhook secret) are server-side env vars only. Client gets only NEXT_PUBLIC_ Firebase config.
Admin dashboard uses Firestore onSnapshot for live updates.
Maintain firestore.rules and firestore.indexes.json in the repo and deploy them (via the Firebase MCP or firebase CLI) whenever queries change.
Code style
TypeScript strict. Server components by default. Zod validation on every API input. Typed Firestore converters for every collection.
Write a test (or verifiable script) proving oversell is rejected.
