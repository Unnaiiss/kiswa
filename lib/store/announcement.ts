import type { AnnouncementBarDoc, AnnouncementBarSpeed, TimestampLike } from "@/lib/firestore/types";

// Match the storefront theme's maroon/cream tokens (app/globals.css) so a
// freshly-created doc looks identical to the old hardcoded bar out of the box.
export const DEFAULT_ANNOUNCEMENT_BACKGROUND = "#4a1220";
export const DEFAULT_ANNOUNCEMENT_TEXT_COLOR = "#f6f1e6";
export const DEFAULT_ANNOUNCEMENT_SPEED: AnnouncementBarSpeed = "normal";

/** CSS animation-duration per speed — "normal" matches the marquee's
 * original fixed 34s pace; slow/fast scale from there. */
export const ANNOUNCEMENT_SPEED_DURATIONS: Record<AnnouncementBarSpeed, string> = {
  slow: "48s",
  normal: "34s",
  fast: "20s",
};

/** True if a combo/date-window is currently valid, mirrors
 * lib/combos.ts's isComboCurrentlyValid — null validFrom/validUntil means
 * "no bound on that side", not "expired". */
function isWithinSchedule(
  validFrom: TimestampLike | null,
  validUntil: TimestampLike | null,
  now: Date,
): boolean {
  if (validFrom && validFrom.toDate() > now) return false;
  if (validUntil && validUntil.toDate() < now) return false;
  return true;
}

/** Single source of truth for "should the announcement bar render at all" —
 * used by both the storefront query (to decide what to fetch/return) and
 * anywhere admin might want to explain why it's currently hidden. Disabled,
 * no messages, or outside its optional validFrom/validUntil window all mean
 * "render nothing", never a broken/empty bar. */
export function isAnnouncementBarRenderable(
  bar: Pick<AnnouncementBarDoc, "isEnabled" | "messages" | "validFrom" | "validUntil">,
  now: Date = new Date(),
): boolean {
  if (!bar.isEnabled) return false;
  if (bar.messages.length === 0) return false;
  return isWithinSchedule(bar.validFrom, bar.validUntil, now);
}
