"use client";

import { useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Modal } from "@/components/admin/modal";
import { adminFetchFormData } from "@/lib/admin/apiClient";
import { useAllProducts } from "@/lib/admin/useAllProducts";
import { computeOriginalPriceInr, comboSavings } from "@/lib/combos";
import { formatInr, formatVariantLabel } from "@/lib/pricing";
import type { Combo, ComboType, Product } from "@/lib/firestore/types";

interface ComboFormProps {
  mode: "create" | "edit";
  combo?: Combo;
  defaultOrder: number;
  onClose: () => void;
  onSaved: () => void;
}

interface FixedItemState {
  key: string;
  productId: string;
  variantId: string;
  qty: number;
}

interface EligibleState {
  key: string;
  productId: string;
  variantId: string;
}

const MAX_RECOMMENDED_BYTES = 1_000_000;

const inputClass =
  "w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-50 placeholder:text-zinc-600 outline-none focus:border-amber-400";

function slugify(text: string) {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function randKey() {
  return Math.random().toString(36).slice(2);
}

function productLabel(p: Product, variantId: string) {
  const v = p.variants.find((x) => x.variantId === variantId);
  return v ? `${p.name} — ${formatVariantLabel(v.type, v.sizeMl)} (${formatInr(v.priceInr)})` : p.name;
}

function ProductVariantPicker({
  products,
  onAdd,
  showQty,
}: {
  products: Product[];
  onAdd: (productId: string, variantId: string, qty: number) => void;
  showQty: boolean;
}) {
  const [productId, setProductId] = useState("");
  const [variantId, setVariantId] = useState("");
  const [qty, setQty] = useState("1");

  const product = products.find((p) => p.id === productId);
  const variants = (product?.variants ?? []).filter((v) => v.isActive);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        aria-label="Select fragrance"
        value={productId}
        onChange={(e) => {
          setProductId(e.target.value);
          setVariantId("");
        }}
        className="min-w-[10rem] flex-1 cursor-pointer rounded-lg border border-zinc-800 bg-zinc-900 px-2.5 py-2 text-sm text-zinc-50 outline-none focus:border-amber-400"
      >
        <option value="">Select fragrance…</option>
        {products.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
      <select
        aria-label="Select size"
        value={variantId}
        onChange={(e) => setVariantId(e.target.value)}
        disabled={!product}
        className="min-w-[9rem] flex-1 cursor-pointer rounded-lg border border-zinc-800 bg-zinc-900 px-2.5 py-2 text-sm text-zinc-50 outline-none focus:border-amber-400 disabled:opacity-40"
      >
        <option value="">Select size…</option>
        {variants.map((v) => (
          <option key={v.variantId} value={v.variantId}>
            {formatVariantLabel(v.type, v.sizeMl)} — {formatInr(v.priceInr)}
          </option>
        ))}
      </select>
      {showQty && (
        <input
          value={qty}
          onChange={(e) => setQty(e.target.value.replace(/\D/g, ""))}
          inputMode="numeric"
          className="w-16 rounded-lg border border-zinc-800 bg-zinc-900 px-2 py-2 text-center text-sm text-zinc-50 outline-none focus:border-amber-400"
        />
      )}
      <button
        type="button"
        disabled={!productId || !variantId}
        onClick={() => {
          onAdd(productId, variantId, Number(qty) || 1);
          setProductId("");
          setVariantId("");
          setQty("1");
        }}
        className="flex cursor-pointer items-center gap-1 rounded-lg border border-zinc-700 px-3 py-2 text-sm text-amber-400 hover:border-amber-400 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Plus size={14} /> Add
      </button>
    </div>
  );
}

export function ComboForm({ mode, combo, defaultOrder, onClose, onSaved }: ComboFormProps) {
  const { products } = useAllProducts();
  const productsById = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

  const [title, setTitle] = useState(combo?.title ?? "");
  const [slug, setSlug] = useState(combo?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(mode === "edit");
  const [description, setDescription] = useState(combo?.description ?? "");
  const [comboPriceInr, setComboPriceInr] = useState(String(combo?.comboPriceInr ?? ""));
  const [type, setType] = useState<ComboType>(combo?.type ?? "fixed");
  const [isActive, setIsActive] = useState(combo?.isActive ?? true);
  const [order, setOrder] = useState(String(combo?.order ?? defaultOrder));
  const [validFrom, setValidFrom] = useState(
    combo?.validFrom ? combo.validFrom.toDate().toISOString().slice(0, 10) : "",
  );
  const [validUntil, setValidUntil] = useState(
    combo?.validUntil ? combo.validUntil.toDate().toISOString().slice(0, 10) : "",
  );
  const [badgeText, setBadgeText] = useState(combo?.badgeText ?? "");

  const [items, setItems] = useState<FixedItemState[]>(
    (combo?.items ?? []).map((i) => ({
      key: randKey(),
      productId: i.productId,
      variantId: i.variantId,
      qty: i.qty,
    })),
  );
  const [chooseCount, setChooseCount] = useState(String(combo?.chooseCount ?? 3));
  const [eligibleVariants, setEligibleVariants] = useState<EligibleState[]>(
    (combo?.eligibleVariants ?? []).map((v) => ({
      key: randKey(),
      productId: v.productId,
      variantId: v.variantId,
    })),
  );

  const [desktopFile, setDesktopFile] = useState<File | null>(null);
  const [mobileFile, setMobileFile] = useState<File | null>(null);
  const [removeDesktopImage, setRemoveDesktopImage] = useState(false);
  const [removeMobileImage, setRemoveMobileImage] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const originalPriceInr = useMemo(
    () =>
      computeOriginalPriceInr(
        type,
        items.map((i) => ({
          productId: i.productId,
          variantId: i.variantId,
          productName: "",
          variantLabel: "",
          qty: i.qty,
        })),
        Number(chooseCount) || 0,
        eligibleVariants.map((v) => ({
          productId: v.productId,
          variantId: v.variantId,
          productName: "",
          variantLabel: "",
        })),
        productsById,
      ),
    [type, items, chooseCount, eligibleVariants, productsById],
  );
  const savings = comboSavings(Number(comboPriceInr) || 0, originalPriceInr);
  const priceTooHigh = originalPriceInr > 0 && (Number(comboPriceInr) || 0) > originalPriceInr;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!title.trim()) return setError("Title is required");
    if (!slug.trim()) return setError("Slug is required");
    if (!Number(comboPriceInr) || Number(comboPriceInr) <= 0) {
      return setError("Combo price must be greater than 0");
    }
    if (type === "fixed" && items.length === 0) {
      return setError("Add at least one item to a fixed combo");
    }
    if (type === "choose-any") {
      if (eligibleVariants.length === 0) return setError("Add at least one eligible variant");
      if (!Number(chooseCount) || Number(chooseCount) < 1) {
        return setError("Choose count must be at least 1");
      }
      if (Number(chooseCount) > eligibleVariants.length) {
        return setError("Choose count can't be more than the number of eligible variants");
      }
    }

    setSubmitting(true);
    const formData = new FormData();
    formData.set("title", title.trim());
    formData.set("slug", slugify(slug));
    formData.set("description", description.trim());
    formData.set("comboPriceInr", comboPriceInr);
    formData.set("type", type);
    formData.set(
      "itemsJson",
      JSON.stringify(items.map((i) => ({ productId: i.productId, variantId: i.variantId, qty: i.qty }))),
    );
    if (type === "choose-any") formData.set("chooseCount", chooseCount);
    formData.set(
      "eligibleVariantsJson",
      JSON.stringify(
        eligibleVariants.map((v) => ({ productId: v.productId, variantId: v.variantId })),
      ),
    );
    formData.set("isActive", String(isActive));
    formData.set("order", String(Number(order) || 0));
    if (validFrom) formData.set("validFrom", validFrom);
    if (validUntil) formData.set("validUntil", validUntil);
    if (badgeText.trim()) formData.set("badgeText", badgeText.trim());
    if (desktopFile) formData.set("desktopImage", desktopFile);
    if (mobileFile) formData.set("mobileImage", mobileFile);
    if (mode === "edit" && removeDesktopImage) formData.set("removeDesktopImage", "true");
    if (mode === "edit" && removeMobileImage) formData.set("removeMobileImage", "true");

    try {
      if (mode === "create") {
        await adminFetchFormData("/api/admin/combos", "POST", formData);
      } else {
        await adminFetchFormData(`/api/admin/combos/${combo!.id}`, "PATCH", formData);
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setSubmitting(false);
    }
  }

  return (
    <Modal
      title={mode === "create" ? "Add Combo Offer" : `Edit ${combo?.title}`}
      onClose={onClose}
      widthClassName="max-w-3xl"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-xs uppercase tracking-wide text-zinc-400">
              Title
            </label>
            <input
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (!slugTouched) setSlug(slugify(e.target.value));
              }}
              className={inputClass}
              placeholder="Any 3 Oils for ₹999"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs uppercase tracking-wide text-zinc-400">
              Slug (/offers/…)
            </label>
            <input
              value={slug}
              onChange={(e) => {
                setSlug(e.target.value);
                setSlugTouched(true);
              }}
              className={inputClass}
              placeholder="any-3-oils"
            />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-xs uppercase tracking-wide text-zinc-400">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className={inputClass}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-xs uppercase tracking-wide text-zinc-400">
              Desktop image (optional)
            </label>
            {combo?.imageUrl && !desktopFile && !removeDesktopImage && (
              <div className="mb-2 flex items-center gap-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={combo.imageUrl} alt="" className="h-16 w-16 rounded-lg border border-zinc-800 object-cover" />
                <button
                  type="button"
                  onClick={() => setRemoveDesktopImage(true)}
                  className="cursor-pointer text-xs text-red-400 hover:text-red-300"
                >
                  Remove
                </button>
              </div>
            )}
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setDesktopFile(e.target.files?.[0] ?? null)}
              className="w-full cursor-pointer text-sm text-zinc-400 file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-zinc-800 file:px-3 file:py-2 file:text-sm file:text-zinc-50 hover:file:bg-zinc-700"
            />
            {desktopFile && desktopFile.size > MAX_RECOMMENDED_BYTES && (
              <p className="mt-1 text-xs text-amber-400">Over the recommended 1MB.</p>
            )}
          </div>
          <div>
            <label className="mb-1.5 block text-xs uppercase tracking-wide text-zinc-400">
              Mobile image (optional)
            </label>
            {combo?.imageUrlMobile && !mobileFile && !removeMobileImage && (
              <div className="mb-2 flex items-center gap-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={combo.imageUrlMobile} alt="" className="h-16 w-16 rounded-lg border border-zinc-800 object-cover" />
                <button
                  type="button"
                  onClick={() => setRemoveMobileImage(true)}
                  className="cursor-pointer text-xs text-red-400 hover:text-red-300"
                >
                  Remove
                </button>
              </div>
            )}
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setMobileFile(e.target.files?.[0] ?? null)}
              className="w-full cursor-pointer text-sm text-zinc-400 file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-zinc-800 file:px-3 file:py-2 file:text-sm file:text-zinc-50 hover:file:bg-zinc-700"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-xs uppercase tracking-wide text-zinc-400">
              Combo price (₹)
            </label>
            <input
              value={comboPriceInr}
              onChange={(e) => setComboPriceInr(e.target.value.replace(/[^0-9.]/g, ""))}
              inputMode="decimal"
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs uppercase tracking-wide text-zinc-400">
              Badge text (optional)
            </label>
            <input
              value={badgeText}
              onChange={(e) => setBadgeText(e.target.value)}
              className={inputClass}
              placeholder="Save ₹500"
            />
          </div>
        </div>

        <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3.5 text-sm">
          <div className="flex justify-between text-zinc-400">
            <span>Regular total (computed)</span>
            <span>{formatInr(originalPriceInr)}</span>
          </div>
          <div className="mt-1 flex justify-between text-zinc-50">
            <span>Savings</span>
            <span className="text-amber-400">
              {formatInr(savings.amount)} ({savings.percent}%)
            </span>
          </div>
          {priceTooHigh && (
            <p className="mt-2 text-xs text-red-400">
              Combo price is higher than the regular total — customers would pay more, not less.
            </p>
          )}
        </div>

        <div className="flex gap-2 rounded-lg border border-zinc-800 p-1">
          {(["fixed", "choose-any"] as ComboType[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className={`flex-1 cursor-pointer rounded-md py-2 text-sm font-medium transition-colors ${
                type === t ? "bg-amber-400 text-zinc-950" : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              {t === "fixed" ? "Fixed bundle" : "Choose any N"}
            </button>
          ))}
        </div>

        {type === "fixed" ? (
          <div className="flex flex-col gap-2">
            <p className="text-xs uppercase tracking-wide text-zinc-400">Bundle contents</p>
            {items.length > 0 && (
              <ul className="flex flex-col gap-1.5">
                {items.map((it) => {
                  const product = productsById.get(it.productId);
                  return (
                    <li
                      key={it.key}
                      className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm"
                    >
                      <span className="text-zinc-200">
                        {product ? productLabel(product, it.variantId) : it.productId} × {it.qty}
                      </span>
                      <button
                        type="button"
                        onClick={() => setItems((prev) => prev.filter((x) => x.key !== it.key))}
                        className="cursor-pointer text-zinc-500 hover:text-red-400"
                      >
                        <Trash2 size={15} />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
            <ProductVariantPicker
              products={products}
              showQty
              onAdd={(productId, variantId, qty) =>
                setItems((prev) => [...prev, { key: randKey(), productId, variantId, qty }])
              }
            />
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <div>
              <label className="mb-1.5 block text-xs uppercase tracking-wide text-zinc-400">
                Customer picks exactly
              </label>
              <input
                value={chooseCount}
                onChange={(e) => setChooseCount(e.target.value.replace(/\D/g, ""))}
                inputMode="numeric"
                className={`${inputClass} w-24`}
              />
            </div>
            <p className="text-xs uppercase tracking-wide text-zinc-400">Eligible variants</p>
            {eligibleVariants.length > 0 && (
              <ul className="flex flex-col gap-1.5">
                {eligibleVariants.map((v) => {
                  const product = productsById.get(v.productId);
                  return (
                    <li
                      key={v.key}
                      className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm"
                    >
                      <span className="text-zinc-200">
                        {product ? productLabel(product, v.variantId) : v.productId}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setEligibleVariants((prev) => prev.filter((x) => x.key !== v.key))
                        }
                        className="cursor-pointer text-zinc-500 hover:text-red-400"
                      >
                        <Trash2 size={15} />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
            <ProductVariantPicker
              products={products}
              showQty={false}
              onAdd={(productId, variantId) =>
                setEligibleVariants((prev) =>
                  prev.some((x) => x.productId === productId && x.variantId === variantId)
                    ? prev
                    : [...prev, { key: randKey(), productId, variantId }],
                )
              }
            />
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-xs uppercase tracking-wide text-zinc-400">
              Valid from (optional)
            </label>
            <input
              type="date"
              value={validFrom}
              onChange={(e) => setValidFrom(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs uppercase tracking-wide text-zinc-400">
              Valid until (optional)
            </label>
            <input
              type="date"
              value={validUntil}
              onChange={(e) => setValidUntil(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-xs uppercase tracking-wide text-zinc-400">
              Order
            </label>
            <input
              value={order}
              onChange={(e) => setOrder(e.target.value.replace(/\D/g, ""))}
              inputMode="numeric"
              className={inputClass}
            />
          </div>
          <label className="flex cursor-pointer items-center gap-2 self-end pb-2.5 text-sm text-zinc-300">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="size-4 rounded border-zinc-700 bg-zinc-900"
            />
            Active
          </label>
        </div>

        {error && (
          <p className="rounded-lg border border-red-400/30 bg-red-400/10 px-3 py-2 text-sm text-red-300">
            {error}
          </p>
        )}

        <div className="mt-2 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:border-zinc-600"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="cursor-pointer rounded-lg bg-amber-400 px-5 py-2 text-sm font-semibold text-zinc-950 hover:bg-amber-300 disabled:opacity-50"
          >
            {submitting ? "Saving…" : mode === "create" ? "Create combo" : "Save changes"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
