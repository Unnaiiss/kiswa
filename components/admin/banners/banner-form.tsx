"use client";

import { useState } from "react";
import { Modal } from "@/components/admin/modal";
import { adminFetchFormData } from "@/lib/admin/apiClient";
import type { Banner } from "@/lib/firestore/types";

interface BannerFormProps {
  mode: "create" | "edit";
  banner?: Banner;
  defaultOrder: number;
  onClose: () => void;
  onSaved: () => void;
}

const MAX_RECOMMENDED_BYTES = 1_000_000;

const inputClass =
  "w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-50 placeholder:text-zinc-600 outline-none focus:border-amber-400";

function formatKb(bytes: number) {
  return `${Math.round(bytes / 1024)} KB`;
}

export function BannerForm({ mode, banner, defaultOrder, onClose, onSaved }: BannerFormProps) {
  const [altText, setAltText] = useState(banner?.altText ?? "");
  const [linkUrl, setLinkUrl] = useState(banner?.linkUrl ?? "");
  const [order, setOrder] = useState(String(banner?.order ?? defaultOrder));
  const [isActive, setIsActive] = useState(banner?.isActive ?? true);

  const [desktopFile, setDesktopFile] = useState<File | null>(null);
  const [mobileFile, setMobileFile] = useState<File | null>(null);
  const [removeMobileImage, setRemoveMobileImage] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!altText.trim()) {
      setError("Alt text is required");
      return;
    }
    if (mode === "create" && !desktopFile) {
      setError("A desktop image is required");
      return;
    }

    setSubmitting(true);
    const formData = new FormData();
    formData.set("altText", altText.trim());
    formData.set("linkUrl", linkUrl.trim());
    formData.set("order", String(Number(order) || 0));
    formData.set("isActive", String(isActive));
    if (desktopFile) formData.set("desktopImage", desktopFile);
    if (mobileFile) formData.set("mobileImage", mobileFile);
    if (mode === "edit" && removeMobileImage) {
      formData.set("removeMobileImage", "true");
    }

    try {
      if (mode === "create") {
        await adminFetchFormData("/api/admin/banners", "POST", formData);
      } else {
        await adminFetchFormData(`/api/admin/banners/${banner!.id}`, "PATCH", formData);
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setSubmitting(false);
    }
  }

  return (
    <Modal
      title={mode === "create" ? "Add Banner" : "Edit Banner"}
      onClose={onClose}
      widthClassName="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        <div>
          <label className="mb-1.5 block text-xs uppercase tracking-wide text-zinc-400">
            Desktop image {mode === "create" && <span className="text-red-400">*</span>}
          </label>
          <p className="mb-1.5 text-xs text-zinc-500">Recommended 1920×800px</p>
          {mode === "edit" && banner?.imageUrl && !desktopFile && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={banner.imageUrl}
              alt=""
              className="mb-2 h-20 w-36 rounded-lg border border-zinc-800 object-cover"
            />
          )}
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setDesktopFile(e.target.files?.[0] ?? null)}
            className="w-full cursor-pointer text-sm text-zinc-400 file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-zinc-800 file:px-3 file:py-2 file:text-sm file:text-zinc-50 hover:file:bg-zinc-700"
          />
          {desktopFile && desktopFile.size > MAX_RECOMMENDED_BYTES && (
            <p className="mt-1 text-xs text-amber-400">
              {formatKb(desktopFile.size)} — over the recommended 1MB, this will slow down page loads.
            </p>
          )}
        </div>

        <div>
          <label className="mb-1.5 block text-xs uppercase tracking-wide text-zinc-400">
            Mobile image (optional)
          </label>
          <p className="mb-1.5 text-xs text-zinc-500">Recommended 1080×1350px — used below the tablet breakpoint</p>
          {mode === "edit" && banner?.imageUrlMobile && !mobileFile && !removeMobileImage && (
            <div className="mb-2 flex items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={banner.imageUrlMobile}
                alt=""
                className="h-20 w-16 rounded-lg border border-zinc-800 object-cover"
              />
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
            onChange={(e) => {
              setMobileFile(e.target.files?.[0] ?? null);
              if (e.target.files?.[0]) setRemoveMobileImage(false);
            }}
            className="w-full cursor-pointer text-sm text-zinc-400 file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-zinc-800 file:px-3 file:py-2 file:text-sm file:text-zinc-50 hover:file:bg-zinc-700"
          />
          {mobileFile && mobileFile.size > MAX_RECOMMENDED_BYTES && (
            <p className="mt-1 text-xs text-amber-400">
              {formatKb(mobileFile.size)} — over the recommended 1MB, this will slow down page loads.
            </p>
          )}
        </div>

        <div>
          <label className="mb-1.5 block text-xs uppercase tracking-wide text-zinc-400">
            Alt text
          </label>
          <input
            value={altText}
            onChange={(e) => setAltText(e.target.value)}
            className={inputClass}
            placeholder="Super Saver Deal — Any 5 for ₹3,899"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs uppercase tracking-wide text-zinc-400">
            Link URL (optional)
          </label>
          <input
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            className={inputClass}
            placeholder="/shop or https://…"
          />
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
            {submitting ? "Saving…" : mode === "create" ? "Add banner" : "Save changes"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
