"use client";

/** Shared visual language for every admin list screen's mobile card view
 * (shown `sm:hidden`, alongside the existing desktop `<table>` which stays
 * `hidden sm:block`/`sm:table` unchanged) — one row of data becomes one
 * card instead of a cramped horizontal-scrolling table row. Deliberately
 * NOT a generic data-driven table-to-card renderer (every admin table has
 * different, meaningfully different columns) — just the recurring card
 * shell + label/value row so every screen's own card markup stays short
 * and looks consistent with every other screen's. */

export function MobileRowCard({
  onClick,
  selected,
  children,
}: {
  onClick?: () => void;
  selected?: boolean;
  children: React.ReactNode;
}) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={`flex w-full flex-col gap-2 rounded-xl border p-4 text-left ${
        selected ? "border-amber-400/60 bg-amber-400/5" : "border-zinc-800 bg-zinc-900"
      } ${onClick ? "cursor-pointer active:bg-zinc-800" : ""}`}
    >
      {children}
    </Tag>
  );
}

export function MobileRowCardList({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col gap-3 sm:hidden">{children}</div>;
}

/** The card's own top line — usually the row's primary identifier (invoice
 * no., product name, title) on the left and its headline value (total,
 * price) on the right. */
export function MobileRowHeader({ children }: { children: React.ReactNode }) {
  return <div className="flex items-start justify-between gap-3">{children}</div>;
}

/** A label: value line below the header — label is always the muted
 * uppercase micro-text every admin table thead already uses. */
export function MobileRowField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-xs tracking-wide text-zinc-500 uppercase">{label}</span>
      <span className="text-right text-zinc-300">{children}</span>
    </div>
  );
}

/** A free-form row for content that doesn't fit the label/value shape
 * (badges, multi-line text, action buttons). */
export function MobileRowFooter({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap items-center gap-2 border-t border-zinc-800 pt-2">{children}</div>;
}
