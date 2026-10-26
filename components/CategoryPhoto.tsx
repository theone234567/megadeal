"use client";

import { useState } from "react";
import Image from "next/image";

/**
 * Lazily loaded decorative photo for a category tile. If it fails to load
 * it removes itself rather than leaving the browser's broken-image glyph,
 * so the category icon drawn behind it shows through as the fallback.
 */
export default function CategoryPhoto({ src, sizes, className, label }: { src: string; sizes: string; className: string; label?: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return (
    <Image
      src={src}
      // Named for search engines; hidden from screen readers, which read
      // the tile's own name (T253).
      alt={label ? `${label} deals in Auckland` : "Deal category photo"}
      aria-hidden
      fill
      loading="lazy"
      sizes={sizes}
      className={className}
      onError={() => setFailed(true)}
    />
  );
}
