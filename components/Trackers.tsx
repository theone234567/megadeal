"use client";

import { usePathname } from "next/navigation";
import MetaPixel from "./MetaPixel";
import GoogleAnalytics from "./GoogleAnalytics";
import ScrollDepthTracker from "./ScrollDepthTracker";
import AttributionCapture from "./AttributionCapture";
import { isTrackingFreePath } from "@/lib/sensitivePaths";

/**
 * Every analytics, advertising and attribution script, except on pages
 * that carry a secret or are private (lib/sensitivePaths.ts). A reset
 * link is always opened fresh from an email, so on that page these never
 * load at all.
 */
export default function Trackers() {
  const pathname = usePathname();
  if (isTrackingFreePath(pathname)) return null;
  return (
    <>
      <MetaPixel />
      <GoogleAnalytics />
      <ScrollDepthTracker />
      <AttributionCapture />
    </>
  );
}
