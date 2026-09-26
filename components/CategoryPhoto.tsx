"use client";

import { useState } from "react";
import Image from "next/image";

/**
 * Lazily loaded decorative photo for a category tile. If it fails to load
 * it removes itself rather than leaving the browser's broken-image glyph,
 * so the category icon drawn behind it shows through as the fallback.
 */
export default function CategoryPhoto({ src, sizes, className }: { src: string; sizes: string; className: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return (
    <Image
      src={src}
      alt=""
      aria-hidden
      fill
      loading="lazy"
      sizes={sizes}
      className={className}
      onError={() => setFailed(true)}
    />
  );
}
