"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Modal } from "@/components/admin/modal";
import { adminFetch } from "@/lib/admin/apiClient";
import type { Product, VariantType } from "@/lib/firestore/types";

interface ProductFormProps {
  mode: "create" | "edit";
  product?: Product;
  onClose: () => void;
  onSaved: () => void;
}

interface VariantEditState {
  key: string;
  originalVariantId: string | null;
  type: VariantType;
  sizeMl: string;
  priceInr: string;
  mrpInr: string;
  lowStockThreshold: string;
  isActive: boolean;
  stock: number;
}

function buildInitialVariantState(product?: Product): VariantEditState[] {
  return (product?.variants ?? []).map((v) => ({
    key: v.variantId,
    originalVariantId: v.variantId,
    type: v.type,
    sizeMl: String(v.sizeMl),
    priceInr: String(v.priceInr),
    mrpInr: String(v.mrpInr),
    lowStockThreshold: String(v.lowStockThreshold),
    isActive: v.isActive,
    stock: v.stock,
  }));
}

function blankVariantRow(): VariantEditState {
  return {
    key: `new-${Math.random().toString(36).slice(2)}`,
    originalVariantId: null,
    type: "oil",
    sizeMl: "",
    priceInr: "",
    mrpInr: "",
    lowStockThreshold: "3",
    isActive: true,
    stock: 0,
  };
}

const inputClass =
  "w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-50 placeholder:text-zinc-600 outline-none focus:border-amber-400";
const cellInputClass =
  "w-full rounded-md border border-zinc-800 bg-zinc-950 px-2 py-1.5 text-sm text-zinc-50 outline-none focus:border-amber-400";

export function ProductForm({ mode, product, onClose, onSaved }: ProductFormProps) {
  const [name, setName] = useState(product?.name ?? "");
  const [description, setDescription] = useState(product?.description ?? "");
  const [notes, setNotes] = useState(product?.notes.join(", ") ?? "");
  const [category, setCategory] = useState(product?.category ?? "Fragrance");
  const [imageUrls, setImageUrls] = useState<string[]>(
    product?.imageUrls && product.imageUrls.length > 0 ? product.imageUrls : [""],
  );
  const [isActive, setIsActive] = useState(product?.isActive ?? true);
  const [basePrice, setBasePrice] = useState("0");
  const [variants, setVariants] = useState<VariantEditState[]>(
    buildInitialVariantState(product),
  );

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateVariant(key: string, patch: Partial<VariantEditState>) {
    setVariants((prev) => prev.map((v) => (v.key === key ? { ...v, ...patch } : v)));
  }
  function addVariantRow() {
    setVariants((prev) => [...prev, blankVariantRow()]);
  }
  function removeVariantRow(key: string) {
    setVariants((prev) => prev.filter((v) => v.key !== key));
  }

  function updateImageUrl(index: number, value: string) {
    setImageUrls((prev) => prev.map((u, i) => (i === index ? value : u)));
  }
  function addImageUrlRow() {
    setImageUrls((prev) => [...prev, ""]);
  }
  function removeImageUrlRow(index: number) {
    setImageUrls((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Name is required");
      return;
    }
    if (mode === "edit") {
      if (variants.length === 0) {
        setError("At least one variant is required.");
        return;
      }
      if (variants.some((v) => !v.sizeMl || Number(v.sizeMl) <= 0)) {
        setError("Enter a size (ml) greater than 0 for every variant.");
        return;
      }
    }

    setSubmitting(true);
    const cleanedNotes = notes.split(",").map((n) => n.trim()).filter(Boolean);
    const cleanedImageUrls = imageUrls.map((u) => u.trim()).filter(Boolean);

    try {
      if (mode === "create") {
        await adminFetch("/api/admin/products", {
          method: "POST",
          body: JSON.stringify({
            name: name.trim(),
            description: description.trim(),
            notes: cleanedNotes,
            category: category.trim(),
            imageUrls: cleanedImageUrls,
            isActive,
            basePrice: Number(basePrice) || 0,
          }),
        });
      } else {
        await adminFetch(`/api/admin/products/${product!.id}`, {
          method: "PATCH",
          body: JSON.stringify({
            name: name.trim(),
            description: description.trim(),
            notes: cleanedNotes,
            category: category.trim(),
            imageUrls: cleanedImageUrls,
            isActive,
            variants: variants.map((v) => ({
              originalVariantId: v.originalVariantId,
              type: v.type,
              sizeMl: Number(v.sizeMl) || 0,
              priceInr: Number(v.priceInr) || 0,
              mrpInr: Number(v.mrpInr) || 0,
              lowStockThreshold:
                Math.max(0, Math.round(Number(v.lowStockThreshold))) || 0,
              isActive: v.isActive,
            })),
          }),
        });
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setSubmitting(false);
    }
  }

  return (
    <Modal
      title={mode === "create" ? "Add Product" : `Edit ${product?.name}`}
      onClose={onClose}
      widthClassName="max-w-3xl"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        <div>
          <label className="mb-1.5 block text-xs uppercase tracking-wide text-zinc-400">
            Name
          </label>
          <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
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
              Category
            </label>
            <input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs uppercase tracking-wide text-zinc-400">
              Fragrance notes (comma separated)
            </label>
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className={inputClass}
              placeholder="bergamot, musk, amber"
            />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-xs uppercase tracking-wide text-zinc-400">
            Image URLs
          </label>
          <div className="flex flex-col gap-2">
            {imageUrls.map((url, idx) => (
              <div key={idx} className="flex gap-2">
                <input
                  value={url}
                  onChange={(e) => updateImageUrl(idx, e.target.value)}
                  className={inputClass}
                  placeholder="https://…"
                />
                <button
                  type="button"
                  onClick={() => removeImageUrlRow(idx)}
                  className="cursor-pointer rounded-lg border border-zinc-800 px-3 text-zinc-400 hover:text-red-400"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={addImageUrlRow}
              className="flex w-fit cursor-pointer items-center gap-1.5 text-sm text-amber-400 hover:text-amber-300"
            >
              <Plus size={14} /> Add image URL
            </button>
          </div>
        </div>

        <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-300">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="size-4 rounded border-zinc-700 bg-zinc-900"
          />
          Active (visible in shop &amp; POS)
        </label>

        {mode === "create" ? (
          <div>
            <label className="mb-1.5 block text-xs uppercase tracking-wide text-zinc-400">
              Starting price (Oil 3ml, ₹) — the standard six sizes auto-price
              from this; fine-tune or add/remove variants after creating
            </label>
            <input
              value={basePrice}
              onChange={(e) => setBasePrice(e.target.value)}
              inputMode="decimal"
              className={inputClass}
            />
          </div>
        ) : (
          <div>
            <p className="mb-2 text-xs uppercase tracking-wide text-zinc-400">
              Variants
            </p>
            <div className="overflow-x-auto">
              <div className="min-w-[44rem]">
                <div className="grid grid-cols-12 gap-2 px-2.5 pb-1 text-[0.65rem] tracking-wide text-zinc-500 uppercase">
                  <span className="col-span-2">Type</span>
                  <span className="col-span-1">Size (ml)</span>
                  <span className="col-span-2">Price</span>
                  <span className="col-span-2">MRP</span>
                  <span className="col-span-2">Threshold</span>
                  <span className="col-span-1">Stock</span>
                  <span className="col-span-1">Active</span>
                  <span className="col-span-1" />
                </div>
                <div className="flex flex-col gap-2">
                  {variants.map((v) => (
                    <div
                      key={v.key}
                      className="grid grid-cols-12 items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900 p-2.5"
                    >
                      <select
                        value={v.type}
                        onChange={(e) =>
                          updateVariant(v.key, { type: e.target.value as VariantType })
                        }
                        className={`col-span-2 ${cellInputClass}`}
                      >
                        <option value="oil">Oil</option>
                        <option value="spray">Spray</option>
                      </select>
                      <input
                        value={v.sizeMl}
                        onChange={(e) =>
                          updateVariant(v.key, {
                            sizeMl: e.target.value.replace(/\D/g, ""),
                          })
                        }
                        className={`col-span-1 ${cellInputClass}`}
                        inputMode="numeric"
                        placeholder="ml"
                      />
                      <input
                        value={v.priceInr}
                        onChange={(e) => updateVariant(v.key, { priceInr: e.target.value })}
                        className={`col-span-2 ${cellInputClass}`}
                        placeholder="Price"
                        inputMode="decimal"
                      />
                      <input
                        value={v.mrpInr}
                        onChange={(e) => updateVariant(v.key, { mrpInr: e.target.value })}
                        className={`col-span-2 ${cellInputClass}`}
                        placeholder="MRP"
                        inputMode="decimal"
                      />
                      <input
                        value={v.lowStockThreshold}
                        onChange={(e) =>
                          updateVariant(v.key, { lowStockThreshold: e.target.value })
                        }
                        className={`col-span-2 ${cellInputClass}`}
                        placeholder="Threshold"
                        inputMode="numeric"
                      />
                      <span className="col-span-1 text-center text-xs text-zinc-500">
                        {v.stock}
                      </span>
                      <label className="col-span-1 flex cursor-pointer justify-center">
                        <input
                          type="checkbox"
                          checked={v.isActive}
                          onChange={(e) =>
                            updateVariant(v.key, { isActive: e.target.checked })
                          }
                          className="size-4 rounded border-zinc-700 bg-zinc-950"
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => removeVariantRow(v.key)}
                        aria-label="Remove variant"
                        className="col-span-1 flex cursor-pointer justify-center text-zinc-500 hover:text-red-400"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={addVariantRow}
              className="mt-2 flex w-fit cursor-pointer items-center gap-1.5 text-sm text-amber-400 hover:text-amber-300"
            >
              <Plus size={14} /> Add variant
            </button>
            <p className="mt-2 text-xs text-zinc-500">
              Stock can only change via Stock In / Adjustment / a sale — it
              can&apos;t be edited here. Removing a variant that still has
              stock is blocked; adjust it to 0 first.
            </p>
          </div>
        )}

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
            {submitting ? "Saving…" : mode === "create" ? "Create product" : "Save changes"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
