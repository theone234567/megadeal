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
 * reached. Tapping or clicking a photo opens it full screen (PhotoViewer).
 */
export default function DealPhotos({ images, alt }: { images: string[]; alt: string }) {
  const track = useRef<HTMLDivElement>(null);
  const [current, setCurrent] = useState(0);
  const [viewing, setViewing] = useState<number | null>(null);
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

  // The whole photo is the button that opens it full screen.
  const opener = (i: number) => (
    <button
      type="button"
      onClick={() => setViewing(i)}
      aria-label={many ? `View photo ${i + 1} of ${images.length} full screen` : "View the photo full screen"}
      className="absolute inset-0 cursor-zoom-in focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-600"
    >
      {img(images[i], i)}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute left-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-slate-900/60 text-white"
      >
        <ExpandIcon />
      </span>
    </button>
  );

  const viewer =
    viewing === null ? null : <PhotoViewer images={images} alt={alt} start={viewing} onClose={() => setViewing(null)} />;

  if (!many) {
    return (
      <>
        <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-brand-50">{opener(0)}</div>
        {viewer}
      </>
    );
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
              {opener(i)}
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
            <img src={wixImageUrl(url, 360, 240)} alt={`Photo ${i + 1}`} aria-hidden="true" loading="lazy" decoding="async" className="aspect-[3/2] w-full object-cover" />
          </button>
        ))}
      </div>
      {viewer}
    </section>
  );
}

/**
 * A deal's photos full screen, the whole photo shown (not cropped), on a
 * dark background: swipe or the arrows (and arrow keys) for the next one,
 * and close with the button, Escape, or a tap on the background. A native
 * <dialog>, so focus stays inside and returns to the photo on closing.
 */
function PhotoViewer({ images, alt, start, onClose }: { images: string[]; alt: string; start: number; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const [current, setCurrent] = useState(start);
  const many = images.length > 1;

  useEffect(() => {
    const d = dialog.current;
    const el = track.current;
    if (!d) return;
    d.showModal();
    closeButton.current?.focus();
    // The page behind doesn't scroll while the photos are open.
    document.documentElement.style.overflow = "hidden";
    if (el) el.scrollLeft = start * el.clientWidth;
    return () => {
      document.documentElement.style.removeProperty("overflow");
    };
  }, [start]);

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

  const round =
    "flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-2xl font-bold text-white transition hover:bg-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white";

  return (
    <dialog
      ref={dialog}
      aria-label={many ? `Photos of this deal, ${images.length} in all` : "Photo of this deal"}
      onClose={onClose}
      onKeyDown={(e) => {
        if (!many) return;
        if (e.key === "ArrowRight") go(current + 1);
        if (e.key === "ArrowLeft") go(current - 1);
      }}
      className="m-0 h-[100dvh] max-h-none w-screen max-w-none bg-slate-950/95 p-0 text-white backdrop:bg-slate-950/80"
    >
      <div
        ref={track}
        // A tap on the dark area around a photo closes the viewer.
        onClick={(e) => {
          if (!(e.target instanceof HTMLImageElement)) dialog.current?.close();
        }}
        className="flex h-full w-full snap-x snap-mandatory overflow-x-auto overflow-y-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {images.map((url, i) => (
          <div key={url} className="flex h-full w-full shrink-0 snap-center items-center justify-center p-2 sm:p-14">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={wixImageUrl(url, 1200, 800)}
              srcSet={wixImageSrcSet(url, [750, 1200], 3 / 2)}
              sizes="100vw"
              alt={many ? `${alt} (photo ${i + 1} of ${images.length})` : alt}
              loading={Math.abs(i - start) <= 1 ? "eager" : "lazy"}
              decoding="async"
              draggable={false}
              className="max-h-full max-w-full rounded-lg object-contain"
            />
          </div>
        ))}
      </div>
      <button
        type="button"
        ref={closeButton}
        onClick={() => dialog.current?.close()}
        aria-label="Close photos"
        className={`${round} absolute right-3 top-[calc(0.75rem+env(safe-area-inset-top))]`}
      >
        <span aria-hidden="true">×</span>
      </button>
      {many && (
        <>
          <button type="button" onClick={() => go(current - 1)} aria-label="Previous photo" className={`${round} absolute left-3 top-1/2 hidden -translate-y-1/2 sm:flex`}>
            ‹
          </button>
          <button type="button" onClick={() => go(current + 1)} aria-label="Next photo" className={`${round} absolute right-3 top-1/2 hidden -translate-y-1/2 sm:flex`}>
            ›
          </button>
          <span
            aria-live="polite"
            className="pointer-events-none absolute bottom-[calc(1rem+env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 rounded-full bg-white/15 px-3 py-1 text-sm font-semibold tabular-nums"
          >
            {current + 1} / {images.length}
          </span>
        </>
      )}
    </dialog>
  );
}

/** Four arrows out to the corners: "see it bigger". */
function ExpandIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
      <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
    </svg>
  );
}
