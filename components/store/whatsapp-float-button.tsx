"use client";

import { buildGenericInquiryMessage, buildWhatsAppUrl } from "@/lib/whatsapp";
import { useSiteSettings } from "@/lib/store/site-settings-context";
import { WhatsAppIcon } from "./whatsapp-icon";

/** Fixed bottom-right chat entry point, shown on every storefront page (not
 * mounted on /pos or /admin — those have their own layouts outside this
 * component tree). Purely a WhatsApp enquiry handoff; doesn't touch cart,
 * stock, or sales. */
export function WhatsAppFloatButton() {
  const { whatsappNumber } = useSiteSettings();
  return (
    <a
      href={buildWhatsAppUrl(buildGenericInquiryMessage(), whatsappNumber)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with KISWA on WhatsApp"
      className="fixed bottom-6 right-4 z-40 flex h-14 w-14 cursor-pointer items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg shadow-black/40 transition-transform hover:scale-105 sm:right-6"
    >
      <WhatsAppIcon size={28} />
    </a>
  );
}
