"use client";

import { useGiftSection } from "@/lib/admin/useGiftSection";
import { useOurStorySection } from "@/lib/admin/useOurStorySection";
import { useAnnouncementBar } from "@/lib/admin/useAnnouncementBar";
import { useImportedSection } from "@/lib/admin/useImportedSection";
import { GiftSectionForm } from "@/components/admin/home-sections/gift-section-form";
import { OurStoryForm } from "@/components/admin/home-sections/our-story-form";
import { AnnouncementBarForm } from "@/components/admin/home-sections/announcement-bar-form";
import { ImportedSectionForm } from "@/components/admin/home-sections/imported-section-form";

export default function AdminHomeSectionsPage() {
  const { giftSection, loading: giftLoading } = useGiftSection();
  const { ourStorySection, loading: ourStoryLoading } = useOurStorySection();
  const { announcementBar, loading: announcementLoading } = useAnnouncementBar();
  const { importedSection, loading: importedLoading } = useImportedSection();

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-50">Home Sections</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Edit admin-controlled content blocks on the storefront homepage.
        </p>
      </div>

      {announcementLoading ? (
        <p className="text-sm text-zinc-500">Loading…</p>
      ) : (
        <AnnouncementBarForm announcementBar={announcementBar} />
      )}

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

      {importedLoading ? (
        <p className="text-sm text-zinc-500">Loading…</p>
      ) : (
        <ImportedSectionForm importedSection={importedSection} />
      )}
    </div>
  );
}
