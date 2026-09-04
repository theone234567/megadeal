"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import Script from "next/script";

const GA_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

/**
 * Loads Google Analytics 4 site-wide, only when
 * NEXT_PUBLIC_GA_MEASUREMENT_ID is configured — set it as a Cloudflare
 * Worker runtime variable once there's a real Measurement ID from
 * analytics.google.com (Admin -> Data Streams -> Web). Absent that var,
 * this renders nothing and costs nothing.
 *
 * No custom events needed for the location/traffic-source question — GA4
 * captures country/city (via IP, aggregated in reports) and referrer/
 * source (which site or ad sent the visitor) automatically on every
 * pageview, visible in the Reports -> Acquisition and Reports ->
 * Demographics tabs once traffic starts coming in.
 *
 * Fires a page_view on first load and again on every client-side route
 * change, since Next.js App Router navigation doesn't reload the page
 * (gtag's own automatic pageview only covers the first one).
 */
export default function GoogleAnalytics() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!GA_ID) return;
    const url = pathname + (searchParams.toString() ? `?${searchParams.toString()}` : "");
    window.gtag?.("event", "page_view", { page_path: url });
  }, [pathname, searchParams]);

  if (!GA_ID) return null;

  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
      <Script id="ga4-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_ID}', { send_page_view: false });
          window.gtag = gtag;
        `}
      </Script>
    </>
  );
}
