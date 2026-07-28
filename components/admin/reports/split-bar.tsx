import { formatInr } from "@/lib/pricing";

interface SplitBarProps {
  title: string;
  segments: { label: string; value: number; color: string }[];
  formatValue?: (value: number) => string;
}

export function SplitBar({ title, segments, formatValue = formatInr }: SplitBarProps) {
  const total = segments.reduce((sum, s) => sum + s.value, 0);

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
      <h2 className="mb-4 text-sm font-semibold text-zinc-50">{title}</h2>
      <div className="mb-3 flex h-3 overflow-hidden rounded-full bg-zinc-800">
        {segments.map((s) => (
          <div
            key={s.label}
            className={s.color}
            style={{ width: total > 0 ? `${(s.value / total) * 100}%` : 0 }}
          />
        ))}
      </div>
      <div className="flex flex-col gap-2">
        {segments.map((s) => (
          <div key={s.label} className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 text-zinc-400">
              <span className={`size-2.5 rounded-full ${s.color}`} />
              {s.label}
            </span>
            <span className="font-medium text-zinc-50">
              {formatValue(s.value)}
              {total > 0 && (
                <span className="ml-1.5 text-xs text-zinc-500">
                  ({Math.round((s.value / total) * 100)}%)
                </span>
              )}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
