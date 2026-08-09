"use client";

import { useEffect, useState } from "react";
import { GripVertical, Plus, Trash2 } from "lucide-react";
import { adminFetch } from "@/lib/admin/apiClient";
import { AnnouncementBarVisual } from "@/components/store/announcement-bar-visual";
import {
  DEFAULT_ANNOUNCEMENT_BACKGROUND,
  DEFAULT_ANNOUNCEMENT_SPEED,
  DEFAULT_ANNOUNCEMENT_TEXT_COLOR,
} from "@/lib/store/announcement";
import type { AnnouncementBar, AnnouncementBarSpeed } from "@/lib/firestore/types";

const inputClass =
  "w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-50 placeholder:text-zinc-600 outline-none focus:border-amber-400";

const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;

const SPEED_OPTIONS: { value: AnnouncementBarSpeed; label: string }[] = [
  { value: "slow", label: "Slow" },
  { value: "normal", label: "Normal" },
  { value: "fast", label: "Fast" },
];

interface MessageRow {
  key: string;
  text: string;
}

function randKey() {
  return Math.random().toString(36).slice(2);
}

function toDateInputValue(date: { toDate(): Date } | null | undefined): string {
  return date ? date.toDate().toISOString().slice(0, 10) : "";
}

export function AnnouncementBarForm({
  announcementBar,
}: {
  announcementBar: AnnouncementBar | null;
}) {
  const [isEnabled, setIsEnabled] = useState(announcementBar?.isEnabled ?? true);
  const [messages, setMessages] = useState<MessageRow[]>(
    (announcementBar?.messages ?? []).map((text) => ({ key: randKey(), text })),
  );
  const [backgroundColor, setBackgroundColor] = useState(
    announcementBar?.backgroundColor ?? DEFAULT_ANNOUNCEMENT_BACKGROUND,
  );
  const [textColor, setTextColor] = useState(
    announcementBar?.textColor ?? DEFAULT_ANNOUNCEMENT_TEXT_COLOR,
  );
  const [speed, setSpeed] = useState<AnnouncementBarSpeed>(
    announcementBar?.speed ?? DEFAULT_ANNOUNCEMENT_SPEED,
  );
  const [linkUrl, setLinkUrl] = useState(announcementBar?.linkUrl ?? "");
  const [validFrom, setValidFrom] = useState(toDateInputValue(announcementBar?.validFrom));
  const [validUntil, setValidUntil] = useState(toDateInputValue(announcementBar?.validUntil));

  const [dragKey, setDragKey] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setIsEnabled(announcementBar?.isEnabled ?? true);
    setMessages((announcementBar?.messages ?? []).map((text) => ({ key: randKey(), text })));
    setBackgroundColor(announcementBar?.backgroundColor ?? DEFAULT_ANNOUNCEMENT_BACKGROUND);
    setTextColor(announcementBar?.textColor ?? DEFAULT_ANNOUNCEMENT_TEXT_COLOR);
    setSpeed(announcementBar?.speed ?? DEFAULT_ANNOUNCEMENT_SPEED);
    setLinkUrl(announcementBar?.linkUrl ?? "");
    setValidFrom(toDateInputValue(announcementBar?.validFrom));
    setValidUntil(toDateInputValue(announcementBar?.validUntil));
  }, [announcementBar]);

  function updateMessage(key: string, text: string) {
    setMessages((prev) => prev.map((m) => (m.key === key ? { ...m, text } : m)));
  }
  function addMessage() {
    setMessages((prev) => [...prev, { key: randKey(), text: "" }]);
  }
  function removeMessage(key: string) {
    setMessages((prev) => prev.filter((m) => m.key !== key));
  }
  function handleDragOver(e: React.DragEvent, overKey: string) {
    e.preventDefault();
    if (!dragKey || dragKey === overKey) return;
    setMessages((prev) => {
      const from = prev.findIndex((m) => m.key === dragKey);
      const to = prev.findIndex((m) => m.key === overKey);
      if (from === -1 || to === -1) return prev;
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  }

  const previewMessages = messages.map((m) => m.text.trim()).filter(Boolean);

  // Same three hide conditions as lib/store/announcement.ts's
  // isAnnouncementBarRenderable, explained in admin instead of left silent —
  // same "why is this hidden" philosophy as the combo-banner warning.
  const now = new Date();
  const validFromDate = validFrom ? new Date(validFrom) : null;
  const validUntilDate = validUntil ? new Date(validUntil) : null;
  const hiddenReason = !isEnabled
    ? "The bar is currently disabled."
    : previewMessages.length === 0
      ? "No messages yet — add at least one below."
      : validFromDate && validFromDate > now
        ? `Not visible yet — starts ${validFromDate.toLocaleDateString()}.`
        : validUntilDate && validUntilDate < now
          ? `Expired — ended ${validUntilDate.toLocaleDateString()}.`
          : null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);

    if (isEnabled && previewMessages.length === 0) {
      setError("Add at least one message, or turn the bar off.");
      return;
    }
    if (!HEX_COLOR_RE.test(backgroundColor)) {
      setError("Background color must be a valid hex code, e.g. #4a1220.");
      return;
    }
    if (!HEX_COLOR_RE.test(textColor)) {
      setError("Text color must be a valid hex code, e.g. #f6f1e6.");
      return;
    }
    if (validFromDate && validUntilDate && validFromDate > validUntilDate) {
      setError("Start date must be before end date.");
      return;
    }

    setSubmitting(true);
    try {
      await adminFetch("/api/admin/site-content/announcement-bar", {
        method: "PATCH",
        body: JSON.stringify({
          isEnabled,
          messages: previewMessages,
          backgroundColor,
          textColor,
          speed,
          linkUrl: linkUrl.trim() || undefined,
          validFrom: validFrom || undefined,
          validUntil: validUntil || undefined,
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
          <h2 className="text-lg font-semibold text-zinc-50">Announcement Bar</h2>
          <p className="mt-1 text-sm text-zinc-500">
            The scrolling strip above the header, shown on every storefront page.
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
          Live preview
        </label>
        {previewMessages.length > 0 ? (
          <div className="overflow-hidden rounded-lg border border-zinc-800">
            <AnnouncementBarVisual
              messages={previewMessages}
              backgroundColor={backgroundColor}
              textColor={textColor}
              speed={speed}
            />
          </div>
        ) : (
          <p className="rounded-lg border border-dashed border-zinc-700 px-3 py-2.5 text-xs text-zinc-600">
            Add a message below to see a preview.
          </p>
        )}
        {hiddenReason && (
          <p className="mt-1.5 text-xs text-amber-400">
            {hiddenReason} The bar is not visible on the storefront right now.
          </p>
        )}
      </div>

      <div>
        <label className="mb-1.5 block text-xs uppercase tracking-wide text-zinc-400">
          Messages
        </label>
        <div className="flex flex-col gap-2">
          {messages.map((m) => (
            <div
              key={m.key}
              draggable
              onDragStart={() => setDragKey(m.key)}
              onDragOver={(e) => handleDragOver(e, m.key)}
              onDrop={() => setDragKey(null)}
              onDragEnd={() => setDragKey(null)}
              className={`flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900 p-1.5 transition-opacity ${
                dragKey === m.key ? "opacity-50" : ""
              }`}
            >
              <span
                className="cursor-grab px-1 text-zinc-600 active:cursor-grabbing"
                aria-hidden
              >
                <GripVertical size={16} />
              </span>
              <input
                value={m.text}
                onChange={(e) => updateMessage(m.key, e.target.value)}
                placeholder="e.g. Super Saver Deal — Any 5 for ₹3,899"
                className="flex-1 bg-transparent px-1 py-1 text-sm text-zinc-50 outline-none placeholder:text-zinc-600"
              />
              <button
                type="button"
                onClick={() => removeMessage(m.key)}
                aria-label="Remove message"
                className="cursor-pointer rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-red-400"
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
          {messages.length === 0 && (
            <p className="rounded-lg border border-dashed border-zinc-700 px-3 py-2.5 text-xs text-zinc-600">
              No messages yet.
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={addMessage}
          className="mt-2 flex cursor-pointer items-center gap-1.5 rounded-lg border border-zinc-700 px-3 py-1.5 text-xs font-medium text-amber-400 hover:border-amber-400"
        >
          <Plus size={14} /> Add message
        </button>
        <p className="mt-1.5 text-xs text-zinc-500">
          Drag to reorder. Multiple messages are joined with a gold dot and looped together.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1.5 block text-xs uppercase tracking-wide text-zinc-400">
            Background color
          </label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={HEX_COLOR_RE.test(backgroundColor) ? backgroundColor : DEFAULT_ANNOUNCEMENT_BACKGROUND}
              onChange={(e) => setBackgroundColor(e.target.value)}
              className="h-10 w-12 shrink-0 cursor-pointer rounded-lg border border-zinc-800 bg-zinc-900 p-1"
            />
            <input
              value={backgroundColor}
              onChange={(e) => setBackgroundColor(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>
        <div>
          <label className="mb-1.5 block text-xs uppercase tracking-wide text-zinc-400">
            Text color
          </label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={HEX_COLOR_RE.test(textColor) ? textColor : DEFAULT_ANNOUNCEMENT_TEXT_COLOR}
              onChange={(e) => setTextColor(e.target.value)}
              className="h-10 w-12 shrink-0 cursor-pointer rounded-lg border border-zinc-800 bg-zinc-900 p-1"
            />
            <input
              value={textColor}
              onChange={(e) => setTextColor(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1.5 block text-xs uppercase tracking-wide text-zinc-400">
            Speed
          </label>
          <div className="flex gap-2 rounded-lg border border-zinc-800 p-1">
            {SPEED_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setSpeed(opt.value)}
                className={`flex-1 cursor-pointer rounded-md py-2 text-sm font-medium transition-colors ${
                  speed === opt.value
                    ? "bg-amber-400 text-zinc-950"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="mb-1.5 block text-xs uppercase tracking-wide text-zinc-400">
            Link URL (optional)
          </label>
          <input
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            className={inputClass}
            placeholder="/offers or https://…"
          />
          <p className="mt-1 text-xs text-zinc-500">Makes the whole bar clickable.</p>
        </div>
      </div>

      <div>
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
        <p className="mt-1.5 text-xs text-zinc-500">
          Leave both empty to show any time the bar is enabled. Outside this window the bar
          hides itself automatically — no need to remember to turn it off.
        </p>
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
