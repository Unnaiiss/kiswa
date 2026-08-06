"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { useAllCombos } from "@/lib/admin/useAllCombos";
import { ComboTable } from "@/components/admin/combos/combo-table";
import { ComboForm } from "@/components/admin/combos/combo-form";
import type { Combo } from "@/lib/firestore/types";

export default function AdminCombosPage() {
  const { combos, loading } = useAllCombos();
  const [dialog, setDialog] = useState<
    { mode: "create" } | { mode: "edit"; combo: Combo } | null
  >(null);

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-50">Combo Offers</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Bundle deals shown on /offers and as quick-add tiles at POS. Drag to reorder.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setDialog({ mode: "create" })}
          className="flex cursor-pointer items-center gap-2 rounded-lg bg-amber-400 px-4 py-2.5 text-sm font-semibold text-zinc-950 hover:bg-amber-300"
        >
          <Plus size={16} />
          Add Combo
        </button>
      </div>

      <ComboTable
        combos={combos}
        loading={loading}
        onEdit={(combo) => setDialog({ mode: "edit", combo })}
      />

      {dialog?.mode === "create" && (
        <ComboForm
          mode="create"
          defaultOrder={combos.length}
          onClose={() => setDialog(null)}
          onSaved={() => setDialog(null)}
        />
      )}
      {dialog?.mode === "edit" && (
        <ComboForm
          mode="edit"
          combo={dialog.combo}
          defaultOrder={combos.length}
          onClose={() => setDialog(null)}
          onSaved={() => setDialog(null)}
        />
      )}
    </div>
  );
}
