import { FieldValue } from "firebase-admin/firestore";
import { siteSettingsDocRef } from "@/lib/firestore/admin-collections";

/** One-time seed of the real KISWA brand details into siteContent/
 * siteSettings. Safe to re-run: only seeds if the doc doesn't exist yet —
 * from then on, admin edits via Home Sections > Brand Settings are the
 * source of truth. */
async function main() {
  const ref = siteSettingsDocRef();
  const snap = await ref.get();
  if (snap.exists) {
    console.log("siteContent/siteSettings already exists — not overwriting. Current data:");
    console.log(snap.data());
    return;
  }

  await ref.set({
    brandName: "KISWA",
    tagline: "Pure Attar · Fine Perfume Sprays",
    shortDescription:
      "Handcrafted attar oils and the fine perfume sprays distilled from them.",
    whatsappNumber: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "919995778963",
    instagramUrl: "https://www.instagram.com/kiswaprfms",
    facebookUrl: null,
    youtubeUrl: null,
    email: "kiswaprfms@gmail.com",
    phone: null,
    addressLine: "Ponoor, Kerala",
    mapUrl: null,
    updatedAt: FieldValue.serverTimestamp(),
  });
  console.log("Seeded siteContent/siteSettings with the real KISWA brand details.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
