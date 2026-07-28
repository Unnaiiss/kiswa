import type { Sale } from "@/lib/firestore/types";
import { itemVariantLabel } from "./salesAggregation";

function csvCell(value: string | number): string {
  const str = String(value);
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

const HEADERS = [
  "Invoice No",
  "Date",
  "Channel",
  "Customer Name",
  "Customer Phone",
  "Product",
  "Variant",
  "Qty",
  "Unit Price (INR)",
  "Line Total (INR)",
  "Oil Used (ml)",
  "Payment Method",
  "Order Status",
];

/** One row per sale line item — the flat shape spreadsheets/pivot tables expect. */
export function salesToCsv(sales: Sale[]): string {
  const rows = [HEADERS.join(",")];

  for (const sale of sales) {
    const date = sale.createdAt.toDate().toLocaleString("en-IN");
    for (const item of sale.items) {
      rows.push(
        [
          csvCell(sale.invoiceNo),
          csvCell(date),
          csvCell(sale.channel),
          csvCell(sale.customerName),
          csvCell(sale.customerPhone),
          csvCell(item.productName),
          csvCell(itemVariantLabel(item)),
          csvCell(item.qty),
          csvCell(item.unitPrice),
          csvCell(item.lineTotal),
          csvCell(item.mlUsed),
          csvCell(sale.paymentMethod),
          csvCell(sale.orderStatus),
        ].join(","),
      );
    }
  }

  return rows.join("\r\n");
}

export function downloadCsv(csv: string, filename: string): void {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
