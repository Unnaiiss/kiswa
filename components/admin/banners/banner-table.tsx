"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, GripVertical, Package, Pencil, Trash2 } from "lucide-react";
import { adminFetch, adminFetchFormData } from "@/lib/admin/apiClient";
import { isComboCurrentlyValid } from "@/lib/combos";
import type { Banner, Combo } from "@/lib/firestore/types";

interface BannerTableProps {
  banners: Banner[];
  combos: Combo[];
  loading: boolean;
  onEdit: (banner: Banner) => void;
}

export function BannerTable({ banners, combos, loading, onEdit }: BannerTableProps) {
  const [items, setItems] = useState<Banner[]>(banners);
  const [dragId, setDragId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setItems(banners);
  }, [banners]);

  const combosById = new Map(combos.map((c) => [c.id, c]));

  function handleDragOver(e: React.DragEvent, overId: string) {
    e.preventDefault();
    if (!dragId || dragId === overId) return;
    setItems((prev) => {
      const from = prev.findIndex((b) => b.id === dragId);
      const to = prev.findIndex((b) => b.id === overId);
      if (from === -1 || to === -1) return prev;
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  }

  async function persistOrder(next: Banner[]) {
    try {
      await adminFetch("/api/admin/banners/reorder", {
        method: "PATCH",
        body: JSON.stringify({
          order: next.map((b, i) => ({ id: b.id, order: i })),
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

  async function toggleActive(banner: Banner) {
    setBusyId(banner.id);
    setError(null);
    try {
      const formData = new FormData();
      formData.set("bannerType", banner.bannerType);
      formData.set("order", String(banner.order));
      formData.set("isActive", String(!banner.isActive));
      if (banner.bannerType === "combo") {
        formData.set("comboId", banner.comboId);
        formData.set("headlineOverride", banner.headlineOverride ?? "");
        formData.set("buttonLabelOverride", banner.buttonLabelOverride ?? "");
      } else {
        formData.set("altText", banner.altText);
        formData.set("linkUrl", banner.linkUrl ?? "");
      }
      await adminFetchFormData(`/api/admin/banners/${banner.id}`, "PATCH", formData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update banner");
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(banner: Banner) {
    const label = banner.bannerType === "combo" ? combosById.get(banner.comboId)?.title ?? "this combo banner" : banner.altText;
    if (!confirm(`Delete "${label}"? This can't be undone.`)) return;
    setBusyId(banner.id);
    setError(null);
    try {
      await adminFetch(`/api/admin/banners/${banner.id}`, { method: "DELETE" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete banner");
    } finally {
      setBusyId(null);
    }
  }

  if (loading) {
    return <p className="text-sm text-zinc-500">Loading banners…</p>;
  }
  if (items.length === 0) {
    return (
      <p className="text-sm text-zinc-500">
        No banners yet. Add one to start the homepage carousel.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {error && (
        <p className="rounded-lg border border-red-400/30 bg-red-400/10 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}
      <div className="flex flex-col gap-2">
        {items.map((banner) => {
          const combo = banner.bannerType === "combo" ? combosById.get(banner.comboId) : null;
          const comboWarning =
            banner.bannerType === "combo"
              ? !combo
                ? "Combo not found — this banner is hidden"
                : !combo.isActive
                  ? "Combo is inactive — this banner is hidden"
                  : !isComboCurrentlyValid(combo)
                    ? "Combo is outside its scheduled dates — this banner is hidden"
                    : null
              : null;
          const title = banner.bannerType === "combo" ? combo?.title ?? "Deleted combo" : banner.altText;
          const subtitle =
            banner.bannerType === "combo"
              ? comboWarning ?? "Combo offer"
              : banner.linkUrl || "No link";
          const thumbSrc = banner.bannerType === "combo" ? combo?.imageUrl ?? null : banner.imageUrl;

          return (
            <div
              key={banner.id}
              draggable
              onDragStart={() => setDragId(banner.id)}
              onDragOver={(e) => handleDragOver(e, banner.id)}
              onDrop={handleDrop}
              onDragEnd={() => setDragId(null)}
              className={`flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900/50 p-3 transition-opacity ${
                dragId === banner.id ? "opacity-50" : ""
              }`}
            >
              <span
                className="cursor-grab text-zinc-600 active:cursor-grabbing"
                aria-hidden
              >
                <GripVertical size={18} />
              </span>
              <div className="flex h-14 w-24 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950">
                {thumbSrc ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={thumbSrc} alt={title} className="h-full w-full object-cover" />
                ) : (
                  <Package className="text-zinc-700" size={20} />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-medium text-zinc-50">{title}</p>
                  {banner.bannerType === "combo" && (
                    <span className="shrink-0 rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] uppercase tracking-wide text-zinc-400">
                      Combo
                    </span>
                  )}
                </div>
                <p
                  className={`truncate text-xs ${comboWarning ? "flex items-center gap-1 text-amber-400" : "text-zinc-500"}`}
                >
                  {comboWarning && <AlertTriangle size={12} className="shrink-0" />}
                  {subtitle}
                </p>
              </div>
              <button
                type="button"
                onClick={() => toggleActive(banner)}
                disabled={busyId === banner.id}
                className={`shrink-0 cursor-pointer rounded-full px-2.5 py-1 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                  banner.isActive
                    ? "bg-green-500/10 text-green-400 hover:bg-green-500/20"
                    : "bg-zinc-800 text-zinc-500 hover:bg-zinc-700"
                }`}
              >
                {banner.isActive ? "Active" : "Inactive"}
              </button>
              <button
                type="button"
                onClick={() => onEdit(banner)}
                aria-label={`Edit ${title}`}
                className="shrink-0 cursor-pointer rounded-lg p-2 text-zinc-400 hover:bg-zinc-800 hover:text-amber-400"
              >
                <Pencil size={16} />
              </button>
              <button
                type="button"
                onClick={() => handleDelete(banner)}
                disabled={busyId === banner.id}
                aria-label={`Delete ${title}`}
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
