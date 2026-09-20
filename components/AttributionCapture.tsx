"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { captureAttribution } from "@/lib/attribution";

/**
 * Silent, renders nothing — captures utm_ or fbclid params into
 * localStorage on first landing (see lib/attribution.ts) so they're still
 * there if a visitor signs up minutes or days later, on a different page
 * than the one their ad actually landed them on. captureAttribution is
 * itself a no-op past the first real capture, so re-running this on every
 * navigation is harmless.
 */
export default function AttributionCapture() {
  const searchParams = useSearchParams();

  useEffect(() => {
    captureAttribution(searchParams);
  }, [searchParams]);

  return null;
}
