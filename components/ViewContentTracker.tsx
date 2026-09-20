"use client";

import { useEffect } from "react";
import { trackMetaPixelEvent } from "@/lib/metaPixel";

/**
 * Fires Meta's ViewContent event once, on mount — for pages where landing
 * itself is the meaningful signal (a business-advertising page, not every
 * "List your business" button that links to it). Renders nothing.
 */
export default function ViewContentTracker({ contentName }: { contentName: string }) {
  useEffect(() => {
    trackMetaPixelEvent("ViewContent", { content_name: contentName });
  }, [contentName]);

  return null;
}
