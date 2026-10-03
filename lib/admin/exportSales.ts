import type { Sale } from "@/lib/firestore/types";
import { normalizeOrderStatus, ORDER_STATUS_LABELS } from "@/lib/orderFulfillment";
import { posStaffLabel } from "@/lib/admin/salesAggregation";

const CSV_COLUMNS = [
  "Invoice",
  "Date",
  "Staff",
  "Customer",
  "Phone",
  "Items",
  "Subtotal",
  "Discount",
  "Total",
  "Payment Method",
  "Payment Status",
  "Order Status",
] as const;

/** Wraps a value in double quotes and escapes any inside it, per RFC 4180 —
 * only needed when the value could itself contain a comma/quote/newline
 * (customer names, mainly), but applied uniformly since it's harmless on
 * plain values too. */
function csvCell(value: string | number): string {
  const str = String(value);
  return `"${str.replace(/"/g, '""')}"`;
}

function saleRow(sale: Sale): string {
  const itemCount = sale.items.reduce((n, i) => n + i.qty, 0);
  return [
    sale.invoiceNo,
    sale.createdAt.toDate().toLocaleString("en-IN"),
    posStaffLabel(sale),
    sale.customerName,
    sale.customerPhone,
    itemCount,
    sale.subtotal,
    sale.discount,
    sale.total,
    sale.paymentMethod,
    sale.paymentStatus,
    ORDER_STATUS_LABELS[normalizeOrderStatus(sale.orderStatus)],
  ]
    .map(csvCell)
    .join(",");
}

export function salesToCsv(sales: Sale[]): string {
  const lines = [CSV_COLUMNS.join(","), ...sales.map(saleRow)];
  // \r\n per RFC 4180 — Excel (still the most common opener for a CSV like
  // this) is markedly more reliable with CRLF line endings than bare \n.
  return lines.join("\r\n");
}

/** Builds the file and clicks a throwaway <a download> — the standard
 * dependency-free way to save a client-generated file, same mechanism
 * every browser's own "Save As" uses under the hood. */
export function downloadTextFile(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
