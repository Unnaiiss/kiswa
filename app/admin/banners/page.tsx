"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { useAllBanners } from "@/lib/admin/useAllBanners";
import { useAllCombos } from "@/lib/admin/useAllCombos";
import { BannerTable } from "@/components/admin/banners/banner-table";
import { BannerForm } from "@/components/admin/banners/banner-form";
import type { Banner } from "@/lib/firestore/types";

export default function AdminBannersPage() {
  const { banners, loading } = useAllBanners();
  const { combos } = useAllCombos();
  const [dialog, setDialog] = useState<
    { mode: "create" } | { mode: "edit"; banner: Banner } | null
  >(null);

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-50">Banners</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Manage the homepage poster carousel. Drag to reorder.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setDialog({ mode: "create" })}
          className="flex cursor-pointer items-center gap-2 rounded-lg bg-amber-400 px-4 py-2.5 text-sm font-semibold text-zinc-950 hover:bg-amber-300"
        >
          <Plus size={16} />
          Add Banner
        </button>
      </div>

      <BannerTable
        banners={banners}
        combos={combos}
        loading={loading}
        onEdit={(banner) => setDialog({ mode: "edit", banner })}
      />

      {dialog?.mode === "create" && (
        <BannerForm
          mode="create"
          combos={combos}
          defaultOrder={banners.length}
          onClose={() => setDialog(null)}
          onSaved={() => setDialog(null)}
        />
      )}
      {dialog?.mode === "edit" && (
        <BannerForm
          mode="edit"
          banner={dialog.banner}
          combos={combos}
          defaultOrder={banners.length}
          onClose={() => setDialog(null)}
          onSaved={() => setDialog(null)}
        />
      )}
    </div>
  );
}
