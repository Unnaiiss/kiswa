import { formatInr } from "@/lib/pricing";

interface StatCardProps {
  label: string;
  revenue: number;
  count?: number;
  accent?: "amber" | "zinc";
}

export function StatCard({ label, revenue, count, accent = "zinc" }: StatCardProps) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
      <p className="text-xs font-medium tracking-wide text-zinc-500 uppercase">
        {label}
      </p>
      <p
        className={`mt-2 text-2xl font-bold ${accent === "amber" ? "text-amber-400" : "text-zinc-50"}`}
      >
        {formatInr(revenue)}
      </p>
      {count !== undefined && (
        <p className="mt-1 text-sm text-zinc-500">
          {count} bill{count === 1 ? "" : "s"}
        </p>
      )}
    </div>
  );
}
