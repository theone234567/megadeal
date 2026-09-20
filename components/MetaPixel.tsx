"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import Script from "next/script";

const PIXEL_ID = "1478448350759686";

/**
 * Loads the Meta (Facebook) Pixel base code site-wide.
 *
 * Hardcoded rather than read from NEXT_PUBLIC_META_PIXEL_ID: that var is
 * set in .github/workflows/deploy.yml's Build step, but the live site
 * still shipped with fbq undefined and no #meta-pixel script — this
 * repo's "Deploy" step (the one that actually pushes to Cloudflare) has
 * been skipped on every run since the workflow was created, so nothing
 * built by CI, this env var included, has ever reached production
 * through it. A literal here needs no deploy-time config to take effect,
 * and it isn't a secret — a Pixel ID is already visible in every page's
 * HTML once the site loads.
 *
 * Fires PageView again on every client-side route change, since Next.js
 * App Router navigation doesn't reload the page — the pixel's own auto
 * PageView on init (below) already covers the first load, so this effect
 * skips its own first run (isFirstRender) rather than also firing then;
 * without that guard the initial page load fired two PageViews for the
 * one visit, inflating counts before a campaign ever got to see them.
 */
export default function MetaPixel() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    window.fbq?.("track", "PageView");
  }, [pathname, searchParams]);

  return (
    <>
      <Script id="meta-pixel" strategy="afterInteractive">
        {`
          !function(f,b,e,v,n,t,s)
          {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
          n.callMethod.apply(n,arguments):n.queue.push(arguments)};
          if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
          n.queue=[];t=b.createElement(e);t.async=!0;
          t.src=v;s=b.getElementsByTagName(e)[0];
          s.parentNode.insertBefore(t,s)}(window, document,'script',
          'https://connect.facebook.net/en_US/fbevents.js');
          fbq('init', '${PIXEL_ID}');
          fbq('track', 'PageView');
        `}
      </Script>
      <noscript>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          height="1"
          width="1"
          alt=""
          style={{ display: "none" }}
          src={`https://www.facebook.com/tr?id=${PIXEL_ID}&ev=PageView&noscript=1`}
        />
      </noscript>
    </>
  );
}
