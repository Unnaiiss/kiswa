"use client";

import { useEffect, useState } from "react";
import { adminFetch } from "@/lib/admin/apiClient";
import {
  DEFAULT_IMPORTED_HEADING,
  DEFAULT_IMPORTED_SUBLINE,
} from "@/lib/store/imported-section-defaults";
import type { ImportedSection } from "@/lib/firestore/types";

const inputClass =
  "w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-50 placeholder:text-zinc-600 outline-none focus:border-amber-400";

export function ImportedSectionForm({
  importedSection,
}: {
  importedSection: ImportedSection | null;
}) {
  const [isEnabled, setIsEnabled] = useState(importedSection?.isEnabled ?? true);
  const [heading, setHeading] = useState(importedSection?.heading ?? DEFAULT_IMPORTED_HEADING);
  const [subline, setSubline] = useState(importedSection?.subline ?? DEFAULT_IMPORTED_SUBLINE);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setIsEnabled(importedSection?.isEnabled ?? true);
    setHeading(importedSection?.heading ?? DEFAULT_IMPORTED_HEADING);
    setSubline(importedSection?.subline ?? DEFAULT_IMPORTED_SUBLINE);
  }, [importedSection]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);

    if (!heading.trim()) {
      setError("Heading is required.");
      return;
    }
    if (!subline.trim()) {
      setError("Subline is required.");
      return;
    }

    setSubmitting(true);
    try {
      await adminFetch("/api/admin/site-content/imported-section", {
        method: "PATCH",
        body: JSON.stringify({
          isEnabled,
          heading: heading.trim(),
          subline: subline.trim(),
        }),
      });
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex max-w-2xl flex-col gap-5 rounded-xl border border-zinc-800 bg-zinc-900/50 p-5"
    >
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-zinc-50">Imported Perfumes Section</h2>
          <p className="mt-1 text-sm text-zinc-500">
            The last section on the homepage, showing products marked &quot;Feature on home
            page&quot; in the product editor.
          </p>
        </div>
        <label className="flex shrink-0 cursor-pointer items-center gap-2 text-sm text-zinc-300">
          <input
            type="checkbox"
            checked={isEnabled}
            onChange={(e) => setIsEnabled(e.target.checked)}
            className="size-4 rounded border-zinc-700 bg-zinc-900"
          />
          Enabled
        </label>
      </div>

      <div>
        <label className="mb-1.5 block text-xs uppercase tracking-wide text-zinc-400">
          Heading
        </label>
        <input
          value={heading}
          onChange={(e) => setHeading(e.target.value)}
          className={inputClass}
          placeholder={DEFAULT_IMPORTED_HEADING}
        />
      </div>

      <div>
        <label className="mb-1.5 block text-xs uppercase tracking-wide text-zinc-400">
          Subline
        </label>
        <input
          value={subline}
          onChange={(e) => setSubline(e.target.value)}
          className={inputClass}
          placeholder={DEFAULT_IMPORTED_SUBLINE}
        />
      </div>

      <p className="text-xs text-zinc-500">
        Even when enabled, this section only shows on the homepage while at least one active,
        in-stock imported product is marked as featured — otherwise it renders nothing, with no
        empty heading left behind.
      </p>

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
