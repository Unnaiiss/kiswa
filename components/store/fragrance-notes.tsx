export function FragranceNotes({ notes }: { notes: string[] }) {
  if (notes.length === 0) return null;

  return (
    <div>
      <p className="mb-3 text-xs uppercase tracking-[0.3em] text-kiswa-ink-muted">
        Fragrance Notes
      </p>
      <div className="flex flex-wrap gap-2">
        {notes.map((note) => (
          <span
            key={note}
            className="rounded-full border border-kiswa-border px-4 py-1.5 text-sm capitalize text-kiswa-ink-muted"
          >
            {note}
          </span>
        ))}
      </div>
    </div>
  );
}
