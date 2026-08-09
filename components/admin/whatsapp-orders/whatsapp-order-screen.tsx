"use client";

import { useCallback, useMemo, useState } from "react";
import { CheckCircle2, MessageCircle, Sparkles, X } from "lucide-react";
import { adminFetch } from "@/lib/admin/apiClient";
import { useActiveProducts } from "@/lib/pos/useActiveProducts";
import { useActiveCombos } from "@/lib/pos/useActiveCombos";
import { isComboFulfillable } from "@/lib/combos";
import { IMPORTED_VARIANT_ID } from "@/lib/products";
import type { Combo, Product, ProductVariant } from "@/lib/firestore/types";
import type { BillLine, ComboBillComponent, DiscountMode, PosPaymentMethod } from "@/lib/pos/types";
import { formatInr, maxAdditionalUnits } from "@/lib/pricing";
import { ProductGrid } from "@/components/pos/product-grid";
import { VariantPickerSheet } from "@/components/pos/variant-picker-sheet";
import { ComboTile } from "@/components/pos/combo-tile";
import { ComboPickerSheet } from "@/components/pos/combo-picker-sheet";
import { BillPanel } from "@/components/pos/bill-panel";

function lineKey(productId: string, variantId: string) {
  return `${productId}:${variantId}`;
}

/** Stable key for a choose-any pick set, so an identical repeat pick
 * increments the same line while a different pick stays separate. */
function hashSelections(components: ComboBillComponent[]): string {
  return components
    .map((c) => `${c.productId}:${c.variantId}:${c.qty}`)
    .sort()
    .join("|");
}

/**
 * Lets an admin re-key a customer's WhatsApp order — chat is enquiry-only
 * and never touches stock (see lib/whatsapp.ts), so this screen is the
 * ONLY place a confirmed WhatsApp order becomes a real sale. It reuses the
 * exact same product grid / bill panel building blocks as the POS billing
 * screen (components/pos/*) and posts to /api/admin/whatsapp-orders/sale,
 * which calls the same recordSale transaction as POS — just channel:
 * "online" instead of "offline".
 */
export function WhatsAppOrderScreen() {
  const { products, loading } = useActiveProducts();
  const { combos } = useActiveCombos();

  const [lines, setLines] = useState<BillLine[]>([]);
  const [pickerProduct, setPickerProduct] = useState<
    (Product & { productType: "attar" }) | null
  >(null);
  const [comboPicker, setComboPicker] = useState<Combo | null>(null);
  const [mobileBillOpen, setMobileBillOpen] = useState(false);

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [discountMode, setDiscountMode] = useState<DiscountMode>("flat");
  const [discountValue, setDiscountValue] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<PosPaymentMethod>("cash");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmedInvoice, setConfirmedInvoice] = useState<string | null>(null);

  const productOilStockMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const product of products) {
      if (product.productType === "attar") map.set(product.id, product.oilStockMl);
    }
    return map;
  }, [products]);

  const productUnitStockMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const product of products) {
      if (product.productType === "imported") map.set(product.id, product.unitStock);
    }
    return map;
  }, [products]);

  const remainingMlForProduct = useCallback(
    (currentLines: BillLine[], productId: string) => {
      const committed = currentLines
        .filter((l) => l.productId === productId)
        .reduce((sum, l) => sum + l.qty * l.oilMlPerUnit, 0);
      return (productOilStockMap.get(productId) ?? 0) - committed;
    },
    [productOilStockMap],
  );

  const remainingUnitsForProduct = useCallback(
    (currentLines: BillLine[], productId: string) => {
      const committed = currentLines
        .filter((l) => l.productId === productId)
        .reduce((sum, l) => sum + l.qty, 0);
      return (productUnitStockMap.get(productId) ?? 0) - committed;
    },
    [productUnitStockMap],
  );

  const subtotal = useMemo(
    () => lines.reduce((sum, l) => sum + l.unitPrice * l.qty, 0),
    [lines],
  );
  const discountAmount = useMemo(() => {
    const raw =
      discountMode === "percent" ? (subtotal * discountValue) / 100 : discountValue;
    return Math.min(Math.max(Math.round(raw), 0), subtotal);
  }, [discountMode, discountValue, subtotal]);
  const total = subtotal - discountAmount;

  function addLine(product: Product, variant: ProductVariant) {
    setLines((prev) => {
      const remaining = remainingMlForProduct(prev, product.id);
      if (remaining < variant.oilMlPerUnit) return prev;

      const key = lineKey(product.id, variant.variantId);
      const idx = prev.findIndex((l) => lineKey(l.productId, l.variantId) === key);
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

  function addImportedLine(product: Product & { productType: "imported" }) {
    setLines((prev) => {
      const remaining = remainingUnitsForProduct(prev, product.id);
      if (remaining < 1) return prev;

      const key = lineKey(product.id, IMPORTED_VARIANT_ID);
      const idx = prev.findIndex((l) => lineKey(l.productId, l.variantId) === key);
      if (idx === -1) {
        return [
          ...prev,
          {
            productId: product.id,
            variantId: IMPORTED_VARIANT_ID,
            productName: product.name,
            type: "oil",
            sizeMl: 0,
            unitPrice: product.priceInr,
            oilMlPerUnit: 0,
            sizeLabel: product.sizeLabel,
            qty: 1,
          },
        ];
      }
      const next = [...prev];
      next[idx] = { ...next[idx], qty: next[idx].qty + 1 };
      return next;
    });
  }

  function addComboLine(
    combo: Combo,
    components: ComboBillComponent[],
    selections: { productId: string; variantId: string }[],
  ) {
    const variantKey = combo.type === "fixed" ? "combo" : `combo:${hashSelections(components)}`;
    setLines((prev) => {
      const key = lineKey(combo.id, variantKey);
      const idx = prev.findIndex((l) => lineKey(l.productId, l.variantId) === key);
      if (idx === -1) {
        return [
          ...prev,
          {
            productId: combo.id,
            variantId: variantKey,
            productName: combo.title,
            type: "oil",
            sizeMl: 0,
            unitPrice: combo.comboPriceInr,
            oilMlPerUnit: 0,
            qty: 1,
            combo: {
              comboId: combo.id,
              comboTitle: combo.title,
              components,
              selections,
            },
          },
        ];
      }
      const next = [...prev];
      next[idx] = { ...next[idx], qty: next[idx].qty + 1 };
      return next;
    });
    setComboPicker(null);
  }

  function handleSelectCombo(combo: Combo) {
    if (combo.type === "fixed") {
      addComboLine(
        combo,
        combo.items.map((i) => ({
          productId: i.productId,
          variantId: i.variantId,
          productName: i.productName,
          variantLabel: i.variantLabel,
          qty: i.qty,
        })),
        [],
      );
      return;
    }
    setComboPicker(combo);
  }

  function handleSelectProduct(product: Product) {
    if (product.productType === "imported") {
      addImportedLine(product);
      return;
    }
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
        if (l.combo) return { ...l, qty: l.qty + 1 };
        if (productUnitStockMap.has(productId)) {
          const remaining = remainingUnitsForProduct(prev, productId);
          if (remaining < 1) return l;
          return { ...l, qty: l.qty + 1 };
        }
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

  function handleToggleGiftWrap(productId: string, variantId: string) {
    setLines((prev) =>
      prev.map((l) =>
        l.productId === productId && l.variantId === variantId
          ? { ...l, giftWrap: !l.giftWrap }
          : l,
      ),
    );
  }

  function resetOrder() {
    setLines([]);
    setCustomerName("");
    setCustomerPhone("");
    setDiscountMode("flat");
    setDiscountValue(0);
    setPaymentMethod("cash");
    setError(null);
    setConfirmedInvoice(null);
    setMobileBillOpen(false);
  }

  async function completeOrder() {
    if (lines.length === 0) return;
    setSubmitting(true);
    setError(null);

    try {
      const data = await adminFetch<{ invoiceNo: string }>("/api/admin/whatsapp-orders/sale", {
        method: "POST",
        body: JSON.stringify({
          items: lines.map((l) =>
            l.combo
              ? {
                  kind: "combo" as const,
                  comboId: l.combo.comboId,
                  qty: l.qty,
                  selections: l.combo.selections,
                }
              : {
                  kind: "product" as const,
                  productId: l.productId,
                  variantId: l.variantId,
                  qty: l.qty,
                  giftWrap: l.giftWrap ?? false,
                },
          ),
          customerName,
          customerPhone,
          discount: { mode: discountMode, value: discountValue },
          paymentMethod,
        }),
      });
      setConfirmedInvoice(data.invoiceNo);
      setSubmitting(false);
      setMobileBillOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setSubmitting(false);
    }
  }

  if (confirmedInvoice) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 rounded-xl border border-zinc-800 bg-zinc-900/50 px-6 py-20 text-center">
        <CheckCircle2 className="text-green-500" size={44} />
        <h2 className="text-xl font-semibold text-zinc-50">Order recorded</h2>
        <p className="text-sm text-zinc-500">Invoice number</p>
        <p className="text-2xl font-bold tracking-widest text-amber-400">{confirmedInvoice}</p>
        <p className="max-w-sm text-sm text-zinc-500">
          Stock has been deducted for this order, same as a POS sale.
        </p>
        <button
          type="button"
          onClick={resetOrder}
          className="mt-2 flex cursor-pointer items-center gap-2 rounded-xl bg-amber-400 px-6 py-3 font-semibold text-zinc-950 hover:bg-amber-300"
        >
          <Sparkles size={18} />
          Record another order
        </button>
      </div>
    );
  }

  const billPanel = (
    <BillPanel
      lines={lines}
      onIncrement={handleIncrement}
      onDecrement={handleDecrement}
      onRemove={handleRemove}
      onToggleGiftWrap={handleToggleGiftWrap}
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
      onCompleteBill={completeOrder}
    />
  );

  return (
    <div className="flex h-[calc(100dvh-8rem)] min-h-[32rem] flex-col overflow-hidden rounded-xl border border-zinc-800 lg:flex-row">
      <div className="flex flex-1 flex-col overflow-hidden">
        {combos.length > 0 && (
          <div className="shrink-0 overflow-x-auto border-b border-zinc-800 bg-zinc-950 p-3">
            <div className="flex gap-3">
              {combos.map((combo) => (
                <div key={combo.id} className="w-32 shrink-0">
                  <ComboTile
                    combo={combo}
                    fulfillable={isComboFulfillable(combo, new Map(products.map((p) => [p.id, p])))}
                    onTap={() => handleSelectCombo(combo)}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
        <ProductGrid
          products={products}
          loading={loading}
          onSelect={handleSelectProduct}
          bottomPadding
        />
      </div>
      <aside className="hidden w-[26rem] shrink-0 border-l border-zinc-800 bg-zinc-950 lg:flex lg:flex-col">
        {billPanel}
      </aside>

      {lines.length > 0 && !mobileBillOpen && (
        <button
          type="button"
          onClick={() => setMobileBillOpen(true)}
          className="fixed inset-x-4 bottom-4 z-30 flex h-16 cursor-pointer items-center justify-between rounded-xl bg-amber-400 px-5 text-zinc-950 shadow-lg lg:hidden"
        >
          <span className="flex items-center gap-2 font-semibold">
            <MessageCircle size={20} />
            {lines.reduce((n, l) => n + l.qty, 0)} item
            {lines.reduce((n, l) => n + l.qty, 0) === 1 ? "" : "s"}
          </span>
          <span className="font-bold">View Order · {formatInr(total)}</span>
        </button>
      )}

      {mobileBillOpen && (
        <div className="fixed inset-0 z-40 flex flex-col bg-zinc-950 lg:hidden">
          <div className="flex shrink-0 items-center justify-between border-b border-zinc-800 px-4 py-3">
            <h2 className="text-lg font-semibold text-zinc-50">Current Order</h2>
            <button
              type="button"
              onClick={() => setMobileBillOpen(false)}
              aria-label="Close order"
              className="cursor-pointer rounded-full p-2 text-zinc-400 hover:text-amber-400"
            >
              <X size={22} />
            </button>
          </div>
          <div className="flex-1 overflow-hidden">{billPanel}</div>
        </div>
      )}

      <VariantPickerSheet
        product={pickerProduct}
        remainingMl={pickerProduct ? remainingMlForProduct(lines, pickerProduct.id) : 0}
        onSelect={addLine}
        onClose={() => setPickerProduct(null)}
      />

      <ComboPickerSheet
        combo={comboPicker}
        products={products}
        onConfirm={(components, selections) =>
          comboPicker && addComboLine(comboPicker, components, selections)
        }
        onClose={() => setComboPicker(null)}
      />
    </div>
  );
}
