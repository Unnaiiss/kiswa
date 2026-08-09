import Link from "next/link";
import { AnnouncementBarVisual } from "./announcement-bar-visual";
import type { StoreAnnouncementBar } from "@/lib/store/queries";

/** Renders nothing at all (no empty strip, no layout shift) when there's no
 * bar to show — `bar` is already null whenever
 * lib/store/announcement.ts's isAnnouncementBarRenderable said so
 * (disabled, no messages, or outside its schedule); see
 * lib/store/queries.ts's getAnnouncementBar, called server-side in
 * app/(store)/layout.tsx so there's never a flash of stale text on load. */
export function AnnouncementBar({ bar }: { bar: StoreAnnouncementBar | null }) {
  if (!bar || bar.messages.length === 0) return null;

  const visual = (
    <AnnouncementBarVisual
      messages={bar.messages}
      backgroundColor={bar.backgroundColor}
      textColor={bar.textColor}
      speed={bar.speed}
    />
  );

  if (!bar.linkUrl) return visual;

  return bar.linkUrl.startsWith("/") ? (
    <Link href={bar.linkUrl} aria-label={bar.messages.join(" — ")}>
      {visual}
    </Link>
  ) : (
    <a href={bar.linkUrl} target="_blank" rel="noopener noreferrer" aria-label={bar.messages.join(" — ")}>
      {visual}
    </a>
  );
}
