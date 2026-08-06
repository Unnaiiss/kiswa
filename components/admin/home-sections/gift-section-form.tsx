"use client";

import { useEffect, useState } from "react";
import { adminFetchFormData } from "@/lib/admin/apiClient";
import {
  DEFAULT_GIFT_BODY,
  DEFAULT_GIFT_BUTTON_LABEL,
  DEFAULT_GIFT_HEADING,
} from "@/lib/store/gift-section-defaults";
import type { GiftSection } from "@/lib/firestore/types";

const MAX_RECOMMENDED_BYTES = 1_000_000;

const inputClass =
  "w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-50 placeholder:text-zinc-600 outline-none focus:border-amber-400";

function formatKb(bytes: number) {
  return `${Math.round(bytes / 1024)} KB`;
}

export function GiftSectionForm({ giftSection }: { giftSection: GiftSection | null }) {
  const [heading, setHeading] = useState(giftSection?.heading ?? DEFAULT_GIFT_HEADING);
  const [body, setBody] = useState(giftSection?.body ?? DEFAULT_GIFT_BODY);
  const [buttonLabel, setButtonLabel] = useState(
    giftSection?.buttonLabel ?? DEFAULT_GIFT_BUTTON_LABEL,
  );

  const [desktopFile, setDesktopFile] = useState<File | null>(null);
  const [mobileFile, setMobileFile] = useState<File | null>(null);
  const [removeMobileImage, setRemoveMobileImage] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setHeading(giftSection?.heading ?? DEFAULT_GIFT_HEADING);
    setBody(giftSection?.body ?? DEFAULT_GIFT_BODY);
    setButtonLabel(giftSection?.buttonLabel ?? DEFAULT_GIFT_BUTTON_LABEL);
  }, [giftSection]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);

    if (!heading.trim() || !body.trim() || !buttonLabel.trim()) {
      setError("Heading, body, and button label are all required.");
      return;
    }
    if (!giftSection?.imageUrl && !desktopFile) {
      setError("A desktop image is required.");
      return;
    }

    setSubmitting(true);
    const formData = new FormData();
    formData.set("heading", heading.trim());
    formData.set("body", body.trim());
    formData.set("buttonLabel", buttonLabel.trim());
    if (desktopFile) formData.set("desktopImage", desktopFile);
    if (mobileFile) formData.set("mobileImage", mobileFile);
    if (removeMobileImage) formData.set("removeMobileImage", "true");

    try {
      await adminFetchFormData("/api/admin/site-content/gift-section", "PATCH", formData);
      setSaved(true);
      setDesktopFile(null);
      setMobileFile(null);
      setRemoveMobileImage(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex max-w-2xl flex-col gap-4 rounded-xl border border-zinc-800 bg-zinc-900/50 p-5"
    >
      <div>
        <h2 className="text-lg font-semibold text-zinc-50">
          &ldquo;Gift a Perfume&rdquo; section
        </h2>
        <p className="mt-1 text-sm text-zinc-500">
          Shown on the homepage between Featured Fragrances and Our Story.
        </p>
      </div>

      <div>
        <label className="mb-1.5 block text-xs uppercase tracking-wide text-zinc-400">
          Desktop image {!giftSection?.imageUrl && <span className="text-red-400">*</span>}
        </label>
        <p className="mb-1.5 text-xs text-zinc-500">Recommended 1200×1500px</p>
        {giftSection?.imageUrl && !desktopFile && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={giftSection.imageUrl}
            alt=""
            className="mb-2 h-28 w-24 rounded-lg border border-zinc-800 object-cover"
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
        <p className="mb-1.5 text-xs text-zinc-500">Recommended 1080×1350px</p>
        {giftSection?.imageUrlMobile && !mobileFile && !removeMobileImage && (
          <div className="mb-2 flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={giftSection.imageUrlMobile}
              alt=""
              className="h-28 w-24 rounded-lg border border-zinc-800 object-cover"
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
          Heading
        </label>
        <input
          value={heading}
          onChange={(e) => setHeading(e.target.value)}
          className={inputClass}
        />
      </div>

      <div>
        <label className="mb-1.5 block text-xs uppercase tracking-wide text-zinc-400">
          Body text
        </label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={4}
          className={inputClass}
        />
      </div>

      <div>
        <label className="mb-1.5 block text-xs uppercase tracking-wide text-zinc-400">
          Button label
        </label>
        <input
          value={buttonLabel}
          onChange={(e) => setButtonLabel(e.target.value)}
          className={inputClass}
        />
        <p className="mt-1 text-xs text-zinc-500">Links to /gift.</p>
      </div>

      {error && (
        <p className="rounded-lg border border-red-400/30 bg-red-400/10 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}
      {saved && <p className="text-sm text-green-400">Saved.</p>}

      <div className="mt-2 flex justify-end">
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
