"use client";

import { useEffect, useRef, useState } from "react";
import { wixImageSrcSet, wixImageUrl } from "@/lib/wixImageUrl";
import { ChevronRightIcon, CloseIcon, SearchIcon } from "@/components/icons";

/**
 * A business's photos as thumbnails; one opens a larger view (a native
 * <dialog>: Esc or the close button shuts it, focus returns to the
 * thumbnail), with previous/next and the arrow keys.
 */
export default function PhotoGallery({ photos, name }: { photos: string[]; name: string }) {
  const [index, setIndex] = useState<number | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const thumbs = useRef<(HTMLButtonElement | null)[]>([]);
  const last = useRef(0);

  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    if (index !== null && !d.open) d.showModal();
    if (index === null && d.open) d.close();
  }, [index]);

  const step = (by: number) => setIndex((i) => (i === null ? i : (i + by + photos.length) % photos.length));

  return (
    <>
      <ul className="grid grid-cols-3 gap-2 sm:gap-3">
        {photos.map((url, i) => (
          <li key={url + i}>
            <button
              ref={(el) => {
                thumbs.current[i] = el;
              }}
              type="button"
              onClick={() => {
                last.current = i;
                setIndex(i);
              }}
              aria-label={`Open photo ${i + 1} of ${photos.length}`}
              className="group relative block aspect-[4/3] w-full overflow-hidden rounded-xl bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={wixImageUrl(url, 480, 320)}
                srcSet={wixImageSrcSet(url, [360, 480], 3 / 2)}
                sizes="(min-width: 1024px) 200px, 31vw"
                alt={`${name}, photo ${i + 1}`}
                loading="lazy"
                decoding="async"
                className="absolute inset-0 h-full w-full object-cover transition group-hover:scale-[1.03]"
              />
              <span aria-hidden="true" className="absolute bottom-1.5 right-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-slate-700 shadow-sm">
                <SearchIcon className="h-4 w-4" />
              </span>
            </button>
          </li>
        ))}
      </ul>

      <dialog
        ref={dialogRef}
        aria-label={`Photos of ${name}`}
        onClose={() => {
          setIndex(null);
          thumbs.current[last.current]?.focus();
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) setIndex(null);
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") step(1);
          if (e.key === "ArrowLeft") step(-1);
        }}
        className="m-auto w-[min(calc(100vw-1.5rem),960px)] overflow-visible bg-transparent p-0 backdrop:bg-slate-900/80"
      >
        {index !== null && (
          <figure className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={wixImageUrl(photos[index], 1200, 800)}
              alt={`${name}, photo ${index + 1} of ${photos.length}`}
              className="max-h-[calc(100dvh-6rem)] w-full rounded-2xl bg-slate-900 object-contain"
            />
            <figcaption className="mt-2 text-center text-sm font-semibold text-white">
              {index + 1} / {photos.length}
            </figcaption>
            <button
              type="button"
              onClick={() => setIndex(null)}
              aria-label="Close photos"
              className="absolute right-2 top-2 flex h-11 w-11 items-center justify-center rounded-full bg-white text-slate-800 shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <CloseIcon className="h-5 w-5" />
            </button>
            {photos.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => step(-1)}
                  aria-label="Previous photo"
                  className="absolute left-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-slate-800 shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                >
                  <ChevronRightIcon className="h-5 w-5 rotate-180" />
                </button>
                <button
                  type="button"
                  onClick={() => step(1)}
                  aria-label="Next photo"
                  className="absolute right-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-slate-800 shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                >
                  <ChevronRightIcon className="h-5 w-5" />
                </button>
              </>
            )}
          </figure>
        )}
      </dialog>
    </>
  );
}
