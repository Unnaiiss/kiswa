"use client";

import { useEffect, useState } from "react";
import { GripVertical, Package, Pencil, Trash2 } from "lucide-react";
import { adminFetch, adminFetchFormData } from "@/lib/admin/apiClient";
import { formatInr } from "@/lib/pricing";
import type { Combo } from "@/lib/firestore/types";

interface ComboTableProps {
  combos: Combo[];
  loading: boolean;
  onEdit: (combo: Combo) => void;
}

function formatDate(d: { toDate(): Date } | null) {
  return d ? d.toDate().toLocaleDateString("en-IN") : null;
}

export function ComboTable({ combos, loading, onEdit }: ComboTableProps) {
  const [items, setItems] = useState<Combo[]>(combos);
  const [dragId, setDragId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setItems(combos);
  }, [combos]);

  function handleDragOver(e: React.DragEvent, overId: string) {
    e.preventDefault();
    if (!dragId || dragId === overId) return;
    setItems((prev) => {
      const from = prev.findIndex((c) => c.id === dragId);
      const to = prev.findIndex((c) => c.id === overId);
      if (from === -1 || to === -1) return prev;
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  }

  async function persistOrder(next: Combo[]) {
    try {
      await adminFetch("/api/admin/combos/reorder", {
        method: "PATCH",
        body: JSON.stringify({
          order: next.map((c, i) => ({ id: c.id, order: i })),
        }),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save order");
    }
  }

  function handleDrop() {
    if (!dragId) return;
    setDragId(null);
    void persistOrder(items);
  }

  async function toggleActive(combo: Combo) {
    setBusyId(combo.id);
    setError(null);
    try {
      const formData = new FormData();
      formData.set("title", combo.title);
      formData.set("slug", combo.slug);
      formData.set("description", combo.description);
      formData.set("comboPriceInr", String(combo.comboPriceInr));
      formData.set("type", combo.type);
      formData.set(
        "itemsJson",
        JSON.stringify(
          combo.items.map((i) => ({ productId: i.productId, variantId: i.variantId, qty: i.qty })),
        ),
      );
      if (combo.chooseCount !== null) formData.set("chooseCount", String(combo.chooseCount));
      formData.set(
        "eligibleVariantsJson",
        JSON.stringify(
          combo.eligibleVariants.map((v) => ({ productId: v.productId, variantId: v.variantId })),
        ),
      );
      formData.set("isActive", String(!combo.isActive));
      formData.set("order", String(combo.order));
      if (combo.badgeText) formData.set("badgeText", combo.badgeText);
      await adminFetchFormData(`/api/admin/combos/${combo.id}`, "PATCH", formData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update combo");
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(combo: Combo) {
    if (!confirm(`Delete "${combo.title}"? This can't be undone.`)) return;
    setBusyId(combo.id);
    setError(null);
    try {
      await adminFetch(`/api/admin/combos/${combo.id}`, { method: "DELETE" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete combo");
      setBusyId(null);
    }
  }

  if (loading) {
    return <p className="text-sm text-zinc-500">Loading combos…</p>;
  }
  if (items.length === 0) {
    return <p className="text-sm text-zinc-500">No combo offers yet.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {error && (
        <p className="rounded-lg border border-red-400/30 bg-red-400/10 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}
      <div className="flex flex-col gap-2">
        {items.map((combo) => {
          const validFrom = formatDate(combo.validFrom);
          const validUntil = formatDate(combo.validUntil);
          return (
            <div
              key={combo.id}
              draggable
              onDragStart={() => setDragId(combo.id)}
              onDragOver={(e) => handleDragOver(e, combo.id)}
              onDrop={handleDrop}
              onDragEnd={() => setDragId(null)}
              className={`flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/50 p-3 transition-opacity ${
                dragId === combo.id ? "opacity-50" : ""
              }`}
            >
              <span className="cursor-grab text-zinc-600 active:cursor-grabbing" aria-hidden>
                <GripVertical size={18} />
              </span>
              <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950">
                {combo.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={combo.imageUrl} alt={combo.title} className="h-full w-full object-cover" />
                ) : (
                  <Package className="text-zinc-600" size={20} />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-zinc-50">{combo.title}</p>
                <p className="truncate text-xs text-zinc-500">
                  {formatInr(combo.comboPriceInr)} ·{" "}
                  {combo.type === "fixed" ? "Fixed bundle" : `Choose any ${combo.chooseCount ?? 0}`}
                  {(validFrom || validUntil) && (
                    <> · {validFrom ?? "…"} – {validUntil ?? "…"}</>
                  )}
                </p>
              </div>
              <button
                type="button"
                onClick={() => toggleActive(combo)}
                disabled={busyId === combo.id}
                className={`shrink-0 cursor-pointer rounded-full px-2.5 py-1 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                  combo.isActive
                    ? "bg-green-500/10 text-green-400 hover:bg-green-500/20"
                    : "bg-zinc-800 text-zinc-500 hover:bg-zinc-700"
                }`}
              >
                {combo.isActive ? "Active" : "Inactive"}
              </button>
              <button
                type="button"
                onClick={() => onEdit(combo)}
                aria-label={`Edit ${combo.title}`}
                className="shrink-0 cursor-pointer rounded-lg p-2 text-zinc-400 hover:bg-zinc-800 hover:text-amber-400"
              >
                <Pencil size={16} />
              </button>
              <button
                type="button"
                onClick={() => handleDelete(combo)}
                disabled={busyId === combo.id}
                aria-label={`Delete ${combo.title}`}
                className="shrink-0 cursor-pointer rounded-lg p-2 text-zinc-400 hover:bg-zinc-800 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Trash2 size={16} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
