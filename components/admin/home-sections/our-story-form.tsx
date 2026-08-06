"use client";

import { useState } from "react";
import { adminFetchFormData } from "@/lib/admin/apiClient";
import type { OurStorySection } from "@/lib/firestore/types";

const MAX_RECOMMENDED_BYTES = 1_000_000;

function formatKb(bytes: number) {
  return `${Math.round(bytes / 1024)} KB`;
}

interface ImageSlotState {
  file: File | null;
  remove: boolean;
}

const EMPTY_SLOT: ImageSlotState = { file: null, remove: false };

function ImageSlot({
  label,
  hint,
  currentUrl,
  state,
  onChange,
}: {
  label: string;
  hint: string;
  currentUrl: string | null | undefined;
  state: ImageSlotState;
  onChange: (next: ImageSlotState) => void;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs uppercase tracking-wide text-zinc-400">
        {label}
      </label>
      <p className="mb-1.5 text-xs text-zinc-500">{hint}</p>
      {currentUrl && !state.file && !state.remove && (
        <div className="mb-2 flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={currentUrl}
            alt=""
            className="h-24 w-24 rounded-lg border border-zinc-800 object-cover"
          />
          <button
            type="button"
            onClick={() => onChange({ file: null, remove: true })}
            className="cursor-pointer text-xs text-red-400 hover:text-red-300"
          >
            Remove
          </button>
        </div>
      )}
      {!currentUrl && !state.file && (
        <div className="mb-2 flex h-24 w-24 items-center justify-center rounded-lg border border-dashed border-zinc-700 text-[10px] text-zinc-600">
          No image
        </div>
      )}
      <input
        type="file"
        accept="image/*"
        onChange={(e) =>
          onChange({ file: e.target.files?.[0] ?? null, remove: false })
        }
        className="w-full cursor-pointer text-sm text-zinc-400 file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-zinc-800 file:px-3 file:py-2 file:text-sm file:text-zinc-50 hover:file:bg-zinc-700"
      />
      {state.file && state.file.size > MAX_RECOMMENDED_BYTES && (
        <p className="mt-1 text-xs text-amber-400">
          {formatKb(state.file.size)} — over the recommended 1MB, this will slow down page loads.
        </p>
      )}
    </div>
  );
}

export function OurStoryForm({
  ourStorySection,
}: {
  ourStorySection: OurStorySection | null;
}) {
  const [oilDesktop, setOilDesktop] = useState<ImageSlotState>(EMPTY_SLOT);
  const [oilMobile, setOilMobile] = useState<ImageSlotState>(EMPTY_SLOT);
  const [sprayDesktop, setSprayDesktop] = useState<ImageSlotState>(EMPTY_SLOT);
  const [sprayMobile, setSprayMobile] = useState<ImageSlotState>(EMPTY_SLOT);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    setSubmitting(true);

    const formData = new FormData();
    if (oilDesktop.file) formData.set("oilDesktopImage", oilDesktop.file);
    if (oilDesktop.remove) formData.set("removeOilDesktopImage", "true");
    if (oilMobile.file) formData.set("oilMobileImage", oilMobile.file);
    if (oilMobile.remove) formData.set("removeOilMobileImage", "true");
    if (sprayDesktop.file) formData.set("sprayDesktopImage", sprayDesktop.file);
    if (sprayDesktop.remove) formData.set("removeSprayDesktopImage", "true");
    if (sprayMobile.file) formData.set("sprayMobileImage", sprayMobile.file);
    if (sprayMobile.remove) formData.set("removeSprayMobileImage", "true");

    try {
      await adminFetchFormData("/api/admin/site-content/our-story", "PATCH", formData);
      setSaved(true);
      setOilDesktop(EMPTY_SLOT);
      setOilMobile(EMPTY_SLOT);
      setSprayDesktop(EMPTY_SLOT);
      setSprayMobile(EMPTY_SLOT);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex max-w-2xl flex-col gap-6 rounded-xl border border-zinc-800 bg-zinc-900/50 p-5"
    >
      <div>
        <h2 className="text-lg font-semibold text-zinc-50">
          &ldquo;Our Story&rdquo; card images
        </h2>
        <p className="mt-1 text-sm text-zinc-500">
          Shown on the homepage&apos;s Our Story section. Leave empty to show a
          plain icon placeholder instead.
        </p>
      </div>

      <div className="flex flex-col gap-4 border-t border-zinc-800 pt-4">
        <p className="text-sm font-medium text-zinc-300">Perfume Oil card</p>
        <ImageSlot
          label="Desktop image"
          hint="Recommended 1200×900px (4:3)"
          currentUrl={ourStorySection?.oilCardImageUrl}
          state={oilDesktop}
          onChange={setOilDesktop}
        />
        <ImageSlot
          label="Mobile image (optional)"
          hint="Recommended 900×675px (4:3)"
          currentUrl={ourStorySection?.oilCardImageUrlMobile}
          state={oilMobile}
          onChange={setOilMobile}
        />
      </div>

      <div className="flex flex-col gap-4 border-t border-zinc-800 pt-4">
        <p className="text-sm font-medium text-zinc-300">Perfume Spray card</p>
        <ImageSlot
          label="Desktop image"
          hint="Recommended 1200×900px (4:3)"
          currentUrl={ourStorySection?.sprayCardImageUrl}
          state={sprayDesktop}
          onChange={setSprayDesktop}
        />
        <ImageSlot
          label="Mobile image (optional)"
          hint="Recommended 900×675px (4:3)"
          currentUrl={ourStorySection?.sprayCardImageUrlMobile}
          state={sprayMobile}
          onChange={setSprayMobile}
        />
      </div>

      {error && (
        <p className="rounded-lg border border-red-400/30 bg-red-400/10 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}
      {saved && <p className="text-sm text-green-400">Saved.</p>}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={submitting}
          className="cursor-pointer rounded-lg bg-amber-400 px-5 py-2 text-sm font-semibold text-zinc-950 hover:bg-amber-300 disabled:opacity-50"
        >
          {submitting ? "Saving…" : "Save changes"}
        </button>
      </div>
    </form>
  );
}
