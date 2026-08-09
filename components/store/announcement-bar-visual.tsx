import { ANNOUNCEMENT_SPEED_DURATIONS } from "@/lib/store/announcement";
import type { AnnouncementBarSpeed } from "@/lib/firestore/types";

const REPEAT_COUNT = 8;

function MarqueeTrack({ messages, textColor }: { messages: string[]; textColor: string }) {
  return (
    <div className="flex shrink-0 items-center" aria-hidden>
      {Array.from({ length: REPEAT_COUNT }).map((_, i) => (
        <span key={i} className="flex shrink-0 items-center">
          {messages.map((message, j) => (
            <span
              key={j}
              className="whitespace-nowrap px-4 text-xs font-medium tracking-wide sm:text-sm"
              style={{ color: textColor }}
            >
              {message}
              <span className="ml-4 text-kiswa-gold-soft">&bull;</span>
            </span>
          ))}
        </span>
      ))}
    </div>
  );
}

/** The marquee's actual visual — no data fetching, no click-wrapper — shared
 * by the real storefront bar (components/store/announcement-bar.tsx) and the
 * admin form's live preview, so "exactly how it will look" is guaranteed
 * rather than approximated by a second implementation. Seamless looping via
 * two identical tracks animated by exactly -50%, so the moment the first
 * track scrolls fully offscreen the second is sitting where the first
 * started — no visible seam. */
export function AnnouncementBarVisual({
  messages,
  backgroundColor,
  textColor,
  speed,
  className,
}: {
  messages: string[];
  backgroundColor: string;
  textColor: string;
  speed: AnnouncementBarSpeed;
  className?: string;
}) {
  if (messages.length === 0) return null;

  return (
    <div
      className={`group relative overflow-hidden py-2 ${className ?? ""}`}
      style={{ backgroundColor }}
    >
      <span className="sr-only">{messages.join(" — ")}</span>
      <div
        className="flex w-max animate-kiswa-marquee group-hover:[animation-play-state:paused] motion-reduce:animate-none"
        style={{ animationDuration: ANNOUNCEMENT_SPEED_DURATIONS[speed] }}
      >
        <MarqueeTrack messages={messages} textColor={textColor} />
        <MarqueeTrack messages={messages} textColor={textColor} />
      </div>
    </div>
  );
}
