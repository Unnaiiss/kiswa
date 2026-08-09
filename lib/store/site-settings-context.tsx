"use client";

import { createContext, useContext } from "react";
import type { StoreSiteSettings } from "@/lib/store/queries";
import {
  DEFAULT_BRAND_NAME,
  DEFAULT_SHORT_DESCRIPTION,
  DEFAULT_TAGLINE,
  DEFAULT_WHATSAPP_NUMBER,
} from "@/lib/store/site-settings-defaults";

const FALLBACK: StoreSiteSettings = {
  brandName: DEFAULT_BRAND_NAME,
  tagline: DEFAULT_TAGLINE,
  shortDescription: DEFAULT_SHORT_DESCRIPTION,
  whatsappNumber: DEFAULT_WHATSAPP_NUMBER,
  instagramUrl: null,
  facebookUrl: null,
  youtubeUrl: null,
  email: null,
  phone: null,
  addressLine: null,
  mapUrl: null,
};

const SiteSettingsContext = createContext<StoreSiteSettings>(FALLBACK);

/** Makes the server-fetched brand/contact settings (see getSiteSettings)
 * available to any client component in the storefront tree without prop-
 * drilling through every intermediate layer — mounted once in the (store)
 * layout, which is the only place this data is actually fetched. */
export function SiteSettingsProvider({
  settings,
  children,
}: {
  settings: StoreSiteSettings;
  children: React.ReactNode;
}) {
  return (
    <SiteSettingsContext.Provider value={settings}>{children}</SiteSettingsContext.Provider>
  );
}

export function useSiteSettings(): StoreSiteSettings {
  return useContext(SiteSettingsContext);
}
