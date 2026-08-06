"use client";

import { useGiftSection } from "@/lib/admin/useGiftSection";
import { useOurStorySection } from "@/lib/admin/useOurStorySection";
import { GiftSectionForm } from "@/components/admin/home-sections/gift-section-form";
import { OurStoryForm } from "@/components/admin/home-sections/our-story-form";

export default function AdminHomeSectionsPage() {
  const { giftSection, loading: giftLoading } = useGiftSection();
  const { ourStorySection, loading: ourStoryLoading } = useOurStorySection();

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-50">Home Sections</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Edit admin-controlled content blocks on the storefront homepage.
        </p>
      </div>

      {giftLoading ? (
        <p className="text-sm text-zinc-500">Loading…</p>
      ) : (
        <GiftSectionForm giftSection={giftSection} />
      )}

      {ourStoryLoading ? (
        <p className="text-sm text-zinc-500">Loading…</p>
      ) : (
        <OurStoryForm ourStorySection={ourStorySection} />
      )}
    </div>
  );
}
