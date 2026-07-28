"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { LogOut, ShoppingBag, X } from "lucide-react";
import { auth } from "@/lib/firebase/client";
import { logout } from "@/lib/auth/session";
import { useActiveProducts } from "@/lib/pos/useActiveProducts";
import type { Product, ProductVariant } from "@/lib/firestore/types";
import type {
  BillLine,
  DiscountMode,
  PosPaymentMethod,
  ReceiptData,
} from "@/lib/pos/types";
import { formatInr, maxAdditionalUnits } from "@/lib/pricing";
import { ProductGrid } from "./product-grid";
import { VariantPickerSheet } from "./variant-picker-sheet";
import { BillPanel } from "./bill-panel";
import { ReceiptScreen } from "./receipt-screen";

function lineKey(productId: string, variantId: string) {
  return `${productId}:${variantId}`;
}

export function BillingScreen({ staffName }: { staffName: string }) {
  const router = useRouter();
  const { products, loading } = useActiveProducts();

  const [lines, setLines] = useState<BillLine[]>([]);
  const [pickerProduct, setPickerProduct] = useState<Product | null>(null);
  const [mobileBillOpen, setMobileBillOpen] = useState(false);

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [discountMode, setDiscountMode] = useState<DiscountMode>("flat");
  const [discountValue, setDiscountValue] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<PosPaymentMethod>("cash");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);

  const productOilStockMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const product of products) map.set(product.id, product.oilStockMl);
    return map;
  }, [products]);

  // Oil left in a product's shared pool right now, after netting out every
  // line already on this bill (any variant of that product).
  const remainingMlForProduct = useCallback(
    (currentLines: BillLine[], productId: string) => {
      const committed = currentLines
        .filter((l) => l.productId === productId)
        .reduce((sum, l) => sum + l.qty * l.oilMlPerUnit, 0);
      return (productOilStockMap.get(productId) ?? 0) - committed;
    },
    [productOilStockMap],
  );

  const subtotal = useMemo(
    () => lines.reduce((sum, l) => sum + l.unitPrice * l.qty, 0),
    [lines],
  );
  const discountAmount = useMemo(() => {
    const raw =
      discountMode === "percent"
        ? (subtotal * discountValue) / 100
        : discountValue;
    return Math.min(Math.max(Math.round(raw), 0), subtotal);
  }, [discountMode, discountValue, subtotal]);
  const total = subtotal - discountAmount;

  function addLine(product: Product, variant: ProductVariant) {
    setLines((prev) => {
      const remaining = remainingMlForProduct(prev, product.id);
      if (remaining < variant.oilMlPerUnit) return prev;

      const key = lineKey(product.id, variant.variantId);
      const idx = prev.findIndex(
        (l) => lineKey(l.productId, l.variantId) === key,
      );
      if (idx === -1) {
        return [
          ...prev,
          {
            productId: product.id,
            variantId: variant.variantId,
            productName: product.name,
            type: variant.type,
            sizeMl: variant.sizeMl,
            unitPrice: variant.priceInr,
            oilMlPerUnit: variant.oilMlPerUnit,
            qty: 1,
          },
        ];
      }
      const next = [...prev];
      next[idx] = { ...next[idx], qty: next[idx].qty + 1 };
      return next;
    });
    setPickerProduct(null);
  }

  function handleSelectProduct(product: Product) {
    const remaining = remainingMlForProduct(lines, product.id);
    const sellable = product.variants.filter(
      (v) => v.isActive && maxAdditionalUnits(remaining, v.oilMlPerUnit) > 0,
    );
    if (sellable.length === 0) return;
    if (sellable.length === 1) {
      addLine(product, sellable[0]);
      return;
    }
    setPickerProduct(product);
  }

  function handleIncrement(productId: string, variantId: string) {
    setLines((prev) =>
      prev.map((l) => {
        if (l.productId !== productId || l.variantId !== variantId) return l;
        const remaining = remainingMlForProduct(prev, productId);
        if (remaining < l.oilMlPerUnit) return l;
        return { ...l, qty: l.qty + 1 };
      }),
    );
  }

  function handleDecrement(productId: string, variantId: string) {
    setLines((prev) =>
      prev
        .map((l) =>
          l.productId === productId && l.variantId === variantId
            ? { ...l, qty: l.qty - 1 }
            : l,
        )
        .filter((l) => l.qty > 0),
    );
  }

  function handleRemove(productId: string, variantId: string) {
    setLines((prev) =>
      prev.filter((l) => !(l.productId === productId && l.variantId === variantId)),
    );
  }

  function resetBill() {
    setLines([]);
    setCustomerName("");
    setCustomerPhone("");
    setDiscountMode("flat");
    setDiscountValue(0);
    setPaymentMethod("cash");
    setError(null);
    setReceipt(null);
    setMobileBillOpen(false);
  }

  async function completeBill() {
    if (lines.length === 0) return;
    setSubmitting(true);
    setError(null);

    try {
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) {
        setError("Your session expired. Please sign in again.");
        setSubmitting(false);
        return;
      }
      const res = await fetch("/api/pos/sale", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          items: lines.map((l) => ({
            productId: l.productId,
            variantId: l.variantId,
            qty: l.qty,
          })),
          customerName,
          customerPhone,
          discount: { mode: discountMode, value: discountValue },
          paymentMethod,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        setSubmitting(false);
        return;
      }

      setReceipt({
        invoiceNo: data.invoiceNo,
        items: lines,
        subtotal: data.subtotal,
        discount: data.discount,
        total: data.total,
        paymentMethod,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        completedAt: new Date(),
      });
      setSubmitting(false);
      setMobileBillOpen(false);
    } catch {
      setError("Network error. Please try again.");
      setSubmitting(false);
    }
  }

  if (receipt) {
    return <ReceiptScreen receipt={receipt} onNewSale={resetBill} />;
  }

  const billPanel = (
    <BillPanel
      lines={lines}
      onIncrement={handleIncrement}
      onDecrement={handleDecrement}
      onRemove={handleRemove}
      customerName={customerName}
      onCustomerNameChange={setCustomerName}
      customerPhone={customerPhone}
      onCustomerPhoneChange={setCustomerPhone}
      discountMode={discountMode}
      onDiscountModeChange={setDiscountMode}
      discountValue={discountValue}
      onDiscountValueChange={setDiscountValue}
      paymentMethod={paymentMethod}
      onPaymentMethodChange={setPaymentMethod}
      subtotal={subtotal}
      discountAmount={discountAmount}
      total={total}
      submitting={submitting}
      error={error}
      onCompleteBill={completeBill}
    />
  );

  return (
    <div className="flex h-dvh flex-col bg-zinc-950 text-zinc-50">
      <header className="flex shrink-0 items-center justify-between border-b border-zinc-800 px-4 py-3">
        <p className="text-sm font-semibold tracking-[0.2em] text-amber-400 uppercase">
          Kiswa POS
        </p>
        <div className="flex items-center gap-3 text-sm text-zinc-400">
          <span className="hidden sm:inline">{staffName}</span>
          <button
            type="button"
            onClick={async () => {
              await logout();
              router.push("/login");
            }}
            aria-label="Sign out"
            className="flex cursor-pointer items-center gap-1.5 rounded-full border border-zinc-800 px-3 py-1.5 hover:border-red-400 hover:text-red-400"
          >
            <LogOut size={14} />
            Sign out
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <ProductGrid
          products={products}
          loading={loading}
          onSelect={handleSelectProduct}
          bottomPadding
        />
        <aside className="hidden w-[26rem] shrink-0 border-l border-zinc-800 lg:flex lg:flex-col">
          {billPanel}
        </aside>
      </div>

      {lines.length > 0 && !mobileBillOpen && (
        <button
          type="button"
          onClick={() => setMobileBillOpen(true)}
          className="fixed inset-x-4 bottom-4 z-30 flex h-16 cursor-pointer items-center justify-between rounded-xl bg-amber-400 px-5 text-zinc-950 shadow-lg lg:hidden"
        >
          <span className="flex items-center gap-2 font-semibold">
            <ShoppingBag size={20} />
            {lines.reduce((n, l) => n + l.qty, 0)} item
            {lines.reduce((n, l) => n + l.qty, 0) === 1 ? "" : "s"}
          </span>
          <span className="font-bold">View Bill · {formatInr(total)}</span>
        </button>
      )}

      <AnimatePresence>
        {mobileBillOpen && (
          <>
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/70 lg:hidden"
              onClick={() => setMobileBillOpen(false)}
            />
            <motion.div
              key="sheet"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="fixed inset-x-0 bottom-0 z-40 flex h-[92vh] flex-col rounded-t-2xl border-t border-zinc-800 bg-zinc-950 lg:hidden"
            >
              <div className="flex shrink-0 items-center justify-between border-b border-zinc-800 px-4 py-3">
                <h2 className="text-lg font-semibold">Current Bill</h2>
                <button
                  type="button"
                  onClick={() => setMobileBillOpen(false)}
                  aria-label="Close bill"
                  className="cursor-pointer rounded-full p-2 text-zinc-400 hover:text-amber-400"
                >
                  <X size={22} />
                </button>
              </div>
              <div className="flex-1 overflow-hidden">{billPanel}</div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <VariantPickerSheet
        product={pickerProduct}
        remainingMl={
          pickerProduct ? remainingMlForProduct(lines, pickerProduct.id) : 0
        }
        onSelect={addLine}
        onClose={() => setPickerProduct(null)}
      />
    </div>
  );
}
