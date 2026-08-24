"use client";

import { useEffect, useRef } from "react";
import Script from "next/script";
import { usePathname, useSearchParams } from "next/navigation";
import { META_PIXEL_ID, isPixelExcludedPath, trackPageView } from "@/lib/analytics/metaPixel";

/**
 * Mounted once in app/(store)/layout.tsx — never in /admin or /pos, which
 * sit outside that layout entirely, so this component simply never renders
 * there. Also self-excludes on /account paths (see isPixelExcludedPath),
 * since those pages are still nested inside the (store) layout but show
 * customer PII on screen.
 *
 * next/script with strategy="afterInteractive" (not a raw <script> tag) so
 * it loads after hydration without blocking the initial page render.
 *
 * SPA page views: the bootstrap script's own `fbq('track', 'PageView')`
 * covers the FIRST load — it runs synchronously as part of the inline
 * script's own execution, so there's no race with window.fbq existing yet.
 * A separate effect below covers every LATER client-side navigation
 * (Next.js doesn't fire a real page load for those, so nothing else would
 * ever re-track them) — it deliberately skips its own first run (via
 * `hasMounted`) since the bootstrap script already accounted for that one;
 * without that guard this would double-count the initial page view.
 */
export function MetaPixel() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const excluded = isPixelExcludedPath(pathname);
  const hasMounted = useRef(false);

  useEffect(() => {
    if (!hasMounted.current) {
      hasMounted.current = true;
      return;
    }
    if (!META_PIXEL_ID || excluded) return;
    trackPageView();
  }, [pathname, searchParams, excluded]);

  if (!META_PIXEL_ID || excluded) return null;

  return (
    <>
      <Script id="meta-pixel-base" strategy="afterInteractive">
        {`
          !function(f,b,e,v,n,t,s)
          {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
          n.callMethod.apply(n,arguments):n.queue.push(arguments)};
          if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
          n.queue=[];t=b.createElement(e);t.async=!0;
          t.src=v;s=b.getElementsByTagName(e)[0];
          s.parentNode.insertBefore(t,s)}(window, document,'script',
          'https://connect.facebook.net/en_US/fbevents.js');
          fbq('init', '${META_PIXEL_ID}');
          fbq('track', 'PageView');
        `}
      </Script>
      <noscript>
        {/* eslint-disable-next-line @next/next/no-img-element -- Meta's own required fallback markup, not a real content image */}
        <img
          height="1"
          width="1"
          style={{ display: "none" }}
          src={`https://www.facebook.com/tr?id=${META_PIXEL_ID}&ev=PageView&noscript=1`}
          alt=""
        />
      </noscript>
    </>
  );
}
