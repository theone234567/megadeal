"use client";

import { useEffect, useRef, useState } from "react";
import { wixImageSrcSet, wixImageUrl } from "@/lib/wixImageUrl";

/**
 * The deal's photos, 16:9 (the 3:2 copies the photo store makes, trimmed
 * top and bottom): the main one first, then any more the business added
 * (lib/dealGallery.ts). With one photo it's a plain image, as before. With
 * more, they sit side by side and snap into place: swipe on a phone, the
 * arrows or the thumbnails on a computer, or the arrow keys once focused.
 * Plain CSS scroll snapping, no slider library, so it costs almost nothing.
 * Only the first photo loads straight away; the rest load as they're
 * reached.
 */
export default function DealPhotos({ images, alt }: { images: string[]; alt: string }) {
  const track = useRef<HTMLDivElement>(null);
  const [current, setCurrent] = useState(0);
  const many = images.length > 1;

  useEffect(() => {
    const el = track.current;
    if (!el || !many) return;
    const onScroll = () => setCurrent(Math.round(el.scrollLeft / Math.max(1, el.clientWidth)));
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [many]);

  function go(i: number) {
    const el = track.current;
    if (!el) return;
    const index = (i + images.length) % images.length;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    el.scrollTo({ left: index * el.clientWidth, behavior: reduce ? "auto" : "smooth" });
  }

  const img = (url: string, i: number) => (
    // A plain <img>: next/image makes no srcset while images are
    // unoptimized, and this lets a phone take a smaller copy.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      // Sizes MegaDeal's own photo storage makes (lib/photoUrl.ts).
      src={wixImageUrl(url, 1200, 800)}
      srcSet={wixImageSrcSet(url, [540, 750, 1200], 3 / 2)}
      sizes="(min-width: 1024px) 640px, (min-width: 640px) 90vw, 100vw"
      alt={many ? `${alt} (photo ${i + 1} of ${images.length})` : alt}
      className="absolute inset-0 h-full w-full object-cover"
      loading={i === 0 ? "eager" : "lazy"}
      fetchPriority={i === 0 ? "high" : "auto"}
      decoding="async"
      draggable={false}
    />
  );

  if (!many) {
    return <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-brand-50">{img(images[0], 0)}</div>;
  }

  const arrow =
    "absolute top-1/2 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-xl font-bold text-slate-800 shadow-card transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 sm:flex";

  return (
    <section aria-roledescription="carousel" aria-label="Photos of this deal">
      <div className="relative">
        <div
          ref={track}
          tabIndex={0}
          aria-label={`Photos, ${images.length} in all. Swipe or use the arrow keys.`}
          className="flex aspect-video w-full snap-x snap-mandatory overflow-x-auto overflow-y-hidden rounded-xl bg-brand-50 [scrollbar-width:none] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 [&::-webkit-scrollbar]:hidden"
        >
          {images.map((url, i) => (
            <div
              key={url}
              role="group"
              aria-roledescription="slide"
              aria-label={`${i + 1} of ${images.length}`}
              className="relative h-full w-full shrink-0 snap-center"
            >
              {img(url, i)}
            </div>
          ))}
        </div>
        <button type="button" onClick={() => go(current - 1)} aria-label="Previous photo" className={`${arrow} left-2`}>
          ‹
        </button>
        <button type="button" onClick={() => go(current + 1)} aria-label="Next photo" className={`${arrow} right-2`}>
          ›
        </button>
        <span
          aria-live="polite"
          className="pointer-events-none absolute bottom-2 right-2 rounded-full bg-slate-900/70 px-2.5 py-0.5 text-xs font-semibold text-white tabular-nums"
        >
          {current + 1} / {images.length}
        </span>
      </div>
      {/* Thumbnails from a tablet up: tap one to jump to it. On a phone
          the counter and swiping do, keeping the price on the first screen. */}
      <div className="mt-2 hidden grid-cols-5 gap-2 sm:grid">
        {images.map((url, i) => (
          <button
            key={url}
            type="button"
            onClick={() => go(i)}
            aria-label={`Show photo ${i + 1}`}
            aria-current={i === current}
            className={`overflow-hidden rounded-lg border-2 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 ${
              i === current ? "border-brand-600" : "border-transparent opacity-80 hover:opacity-100"
            }`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={wixImageUrl(url, 360, 240)} alt="" loading="lazy" decoding="async" className="aspect-[3/2] w-full object-cover" />
          </button>
        ))}
      </div>
    </section>
  );
}
