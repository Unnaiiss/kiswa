import { FieldValue } from "firebase-admin/firestore";
import { announcementBarDocRef } from "@/lib/firestore/admin-collections";
import {
  DEFAULT_ANNOUNCEMENT_BACKGROUND,
  DEFAULT_ANNOUNCEMENT_SPEED,
  DEFAULT_ANNOUNCEMENT_TEXT_COLOR,
} from "@/lib/store/announcement";

/** One-time seed: the announcement bar used to be a hardcoded constant
 * (lib/store/announcement.ts's old ANNOUNCEMENT_TEXT). This preserves that
 * exact text as the first message in the new Firestore-backed doc so the
 * storefront bar doesn't just disappear the moment this deploy ships —
 * admins can edit or replace it from here on via Home Sections. Safe to
 * re-run: only seeds if the doc doesn't exist yet. */
async function main() {
  const ref = announcementBarDocRef();
  const snap = await ref.get();
  if (snap.exists) {
    console.log("siteContent/announcementBar already exists — not overwriting. Current data:");
    console.log(snap.data());
    return;
  }

  await ref.set({
    isEnabled: true,
    messages: ["Super Saver Deal Live Now — Any 5 for ₹3,899"],
    backgroundColor: DEFAULT_ANNOUNCEMENT_BACKGROUND,
    textColor: DEFAULT_ANNOUNCEMENT_TEXT_COLOR,
    speed: DEFAULT_ANNOUNCEMENT_SPEED,
    linkUrl: null,
    validFrom: null,
    validUntil: null,
    updatedAt: FieldValue.serverTimestamp(),
  });
  console.log("Seeded siteContent/announcementBar with the previous hardcoded text.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
