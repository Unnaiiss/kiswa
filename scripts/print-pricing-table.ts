import { buildCatalogProducts } from "@/lib/catalog";
import { VARIANT_DEFINITIONS } from "@/lib/pricing";

const products = buildCatalogProducts();

function variantHeader(v: (typeof VARIANT_DEFINITIONS)[number]): string {
  const label = v.type === "oil" ? "Oil" : "Spray";
  return `${label} ${v.sizeMl}ml`;
}

function formatInr(n: number): string {
  return `₹${n}`;
}

function printTable(rows: string[][], headers: string[]) {
  const widths = headers.map((h, i) =>
    Math.max(h.length, ...rows.map((r) => r[i].length)),
  );
  const line = (cells: string[]) =>
    cells.map((c, i) => c.padEnd(widths[i])).join("  |  ");
  console.log(line(headers));
  console.log(widths.map((w) => "-".repeat(w)).join("--+--"));
  for (const row of rows) console.log(line(row));
}

const active = products.filter((p) => p.isActive);
const pending = products.filter((p) => !p.isActive);

console.log(`\n=== ACTIVE PRODUCTS (${active.length}) ===\n`);
printTable(
  active.map((p) => [
    p.name,
    formatInr(p.basePrice ?? 0),
    ...p.variants.map((v) => formatInr(v.priceInr)),
  ]),
  ["Product", "Base (Oil 3ml)", ...VARIANT_DEFINITIONS.map(variantHeader)],
);

console.log(`\n=== PENDING PRODUCTS (${pending.length}) — price not decided, all variants ₹0 ===\n`);
for (const p of pending) {
  console.log(`  - ${p.name}`);
}
console.log();
