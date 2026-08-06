"use client";

import { useEffect, useState } from "react";
import { GripVertical, Pencil, Trash2 } from "lucide-react";
import { adminFetch, adminFetchFormData } from "@/lib/admin/apiClient";
import type { Banner } from "@/lib/firestore/types";

interface BannerTableProps {
  banners: Banner[];
  loading: boolean;
  onEdit: (banner: Banner) => void;
}

export function BannerTable({ banners, loading, onEdit }: BannerTableProps) {
  const [items, setItems] = useState<Banner[]>(banners);
  const [dragId, setDragId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setItems(banners);
  }, [banners]);

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
      formData.set("altText", banner.altText);
      formData.set("linkUrl", banner.linkUrl ?? "");
      formData.set("order", String(banner.order));
      formData.set("isActive", String(!banner.isActive));
      await adminFetchFormData(`/api/admin/banners/${banner.id}`, "PATCH", formData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update banner");
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(banner: Banner) {
    if (!confirm("Delete this banner? This can't be undone.")) return;
    setBusyId(banner.id);
    setError(null);
    try {
      await adminFetch(`/api/admin/banners/${banner.id}`, { method: "DELETE" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete banner");
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
        {items.map((banner) => (
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
            <div className="h-14 w-24 shrink-0 overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={banner.imageUrl}
                alt={banner.altText}
                className="h-full w-full object-cover"
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-zinc-50">
                {banner.altText}
              </p>
              <p className="truncate text-xs text-zinc-500">
                {banner.linkUrl || "No link"}
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
              aria-label={`Edit ${banner.altText}`}
              className="shrink-0 cursor-pointer rounded-lg p-2 text-zinc-400 hover:bg-zinc-800 hover:text-amber-400"
            >
              <Pencil size={16} />
            </button>
            <button
              type="button"
              onClick={() => handleDelete(banner)}
              disabled={busyId === banner.id}
              aria-label={`Delete ${banner.altText}`}
              className="shrink-0 cursor-pointer rounded-lg p-2 text-zinc-400 hover:bg-zinc-800 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
