import { ANNOUNCEMENT_TEXT } from "@/lib/store/announcement";

const REPEAT_COUNT = 8;

function MarqueeTrack() {
  return (
    <div className="flex shrink-0 items-center" aria-hidden>
      {Array.from({ length: REPEAT_COUNT }).map((_, i) => (
        <span
          key={i}
          className="whitespace-nowrap px-4 text-xs font-medium tracking-wide text-kiswa-ink sm:text-sm"
        >
          {ANNOUNCEMENT_TEXT}
          <span className="ml-4 text-kiswa-gold-soft">&bull;</span>
        </span>
      ))}
    </div>
  );
}

// Seamless looping marquee: two identical tracks side by side, animated by
// exactly -50% so the moment the first track scrolls fully offscreen, the
// second is sitting exactly where the first started — no visible seam.
export function AnnouncementBar() {
  return (
    <div className="group relative overflow-hidden bg-kiswa-maroon py-2">
      <span className="sr-only">{ANNOUNCEMENT_TEXT}</span>
      <div className="flex w-max animate-kiswa-marquee group-hover:[animation-play-state:paused] motion-reduce:animate-none">
        <MarqueeTrack />
        <MarqueeTrack />
      </div>
    </div>
  );
}
