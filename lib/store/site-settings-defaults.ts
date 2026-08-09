import { WHATSAPP_NUMBER } from "@/lib/whatsapp";

// Fallback used only if siteContent/siteSettings doesn't exist yet (matches
// giftSection's hardcoded-defaults pattern) — the real values live in
// Firestore from the moment the seed script runs.
export const DEFAULT_BRAND_NAME = "KISWA";
export const DEFAULT_TAGLINE = "Pure Attar · Fine Perfume Sprays";
export const DEFAULT_SHORT_DESCRIPTION =
  "Handcrafted attar oils and the fine perfume sprays distilled from them.";
export const DEFAULT_ADDRESS_LINE = "Ponoor, Kerala";
export const DEFAULT_INSTAGRAM_URL = "https://www.instagram.com/kiswaprfms";
export const DEFAULT_EMAIL = "kiswaprfms@gmail.com";
export const DEFAULT_WHATSAPP_NUMBER = WHATSAPP_NUMBER;
