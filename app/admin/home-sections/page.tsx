"use client";

import { useGiftSection } from "@/lib/admin/useGiftSection";
import { useOurStorySection } from "@/lib/admin/useOurStorySection";
import { useAnnouncementBar } from "@/lib/admin/useAnnouncementBar";
import { useImportedSection } from "@/lib/admin/useImportedSection";
import { useSiteSettings } from "@/lib/admin/useSiteSettings";
import { useNotificationSettings } from "@/lib/admin/useNotificationSettings";
import { useCheckoutSettings } from "@/lib/admin/useCheckoutSettings";
import { GiftSectionForm } from "@/components/admin/home-sections/gift-section-form";
import { OurStoryForm } from "@/components/admin/home-sections/our-story-form";
import { AnnouncementBarForm } from "@/components/admin/home-sections/announcement-bar-form";
import { ImportedSectionForm } from "@/components/admin/home-sections/imported-section-form";
import { BrandSettingsForm } from "@/components/admin/home-sections/brand-settings-form";
import { NotificationSettingsForm } from "@/components/admin/home-sections/notification-settings-form";
import { CheckoutSettingsForm } from "@/components/admin/home-sections/checkout-settings-form";
import { PaymentModeIndicator } from "@/components/admin/payment-mode-indicator";
import { ONLINE_PAYMENTS_ENABLED } from "@/lib/config/featureFlags";

export default function AdminHomeSectionsPage() {
  const { giftSection, loading: giftLoading } = useGiftSection();
  const { ourStorySection, loading: ourStoryLoading } = useOurStorySection();
  const { announcementBar, loading: announcementLoading } = useAnnouncementBar();
  const { importedSection, loading: importedLoading } = useImportedSection();
  const { siteSettings, loading: siteSettingsLoading } = useSiteSettings();
  const { statusChangeWhatsAppEnabled, loading: notificationLoading } = useNotificationSettings();
  const { codEnabled, loading: checkoutSettingsLoading } = useCheckoutSettings();

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-50">Home Sections</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Edit admin-controlled content blocks on the storefront homepage.
        </p>
      </div>

      {/* Read-only — flip NEXT_PUBLIC_ONLINE_PAYMENTS_ENABLED to change this,
       * there's nothing to edit here. Same indicator also shown at the top
       * of the Dashboard (components/admin/payment-mode-indicator.tsx). */}
      <PaymentModeIndicator />

      {siteSettingsLoading ? (
        <p className="text-sm text-zinc-500">Loading…</p>
      ) : (
        <BrandSettingsForm siteSettings={siteSettings} />
      )}

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

      {notificationLoading ? (
        <p className="text-sm text-zinc-500">Loading…</p>
      ) : (
        <NotificationSettingsForm statusChangeWhatsAppEnabled={statusChangeWhatsAppEnabled} />
      )}

      {ONLINE_PAYMENTS_ENABLED &&
        (checkoutSettingsLoading ? (
          <p className="text-sm text-zinc-500">Loading…</p>
        ) : (
          <CheckoutSettingsForm codEnabled={codEnabled} />
        ))}
    </div>
  );
}
