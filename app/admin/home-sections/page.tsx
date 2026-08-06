"use client";

import { useGiftSection } from "@/lib/admin/useGiftSection";
import { GiftSectionForm } from "@/components/admin/home-sections/gift-section-form";

export default function AdminHomeSectionsPage() {
  const { giftSection, loading } = useGiftSection();

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-50">Home Sections</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Edit admin-controlled content blocks on the storefront homepage.
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-zinc-500">Loading…</p>
      ) : (
        <GiftSectionForm giftSection={giftSection} />
      )}
    </div>
  );
}
