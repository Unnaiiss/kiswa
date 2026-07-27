"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { useAllProducts } from "@/lib/admin/useAllProducts";
import { ProductTable } from "@/components/admin/products/product-table";
import { ProductForm } from "@/components/admin/products/product-form";
import type { Product } from "@/lib/firestore/types";

export default function AdminProductsPage() {
  const { products, loading } = useAllProducts();
  const [dialog, setDialog] = useState<
    { mode: "create" } | { mode: "edit"; product: Product } | null
  >(null);

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-50">Products</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Manage the catalog, pricing, and variant availability.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setDialog({ mode: "create" })}
          className="flex cursor-pointer items-center gap-2 rounded-lg bg-amber-400 px-4 py-2.5 text-sm font-semibold text-zinc-950 hover:bg-amber-300"
        >
          <Plus size={16} />
          Add Product
        </button>
      </div>

      <ProductTable
        products={products}
        loading={loading}
        onEdit={(product) => setDialog({ mode: "edit", product })}
      />

      {dialog?.mode === "create" && (
        <ProductForm
          mode="create"
          onClose={() => setDialog(null)}
          onSaved={() => setDialog(null)}
        />
      )}
      {dialog?.mode === "edit" && (
        <ProductForm
          mode="edit"
          product={dialog.product}
          onClose={() => setDialog(null)}
          onSaved={() => setDialog(null)}
        />
      )}
    </div>
  );
}
