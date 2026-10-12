"use client";

import { useState } from "react";

/** Past this, the description is cut to a few lines with "Read more". */
const PREVIEW = 260;

/**
 * A business's description, cut to four lines with "Read more" when it's
 * long, so the deals below aren't pushed down a phone's screen. The whole
 * text is in the page either way (for search engines and screen readers);
 * only how much shows changes.
 */
export default function ClampedBio({ text, className = "" }: { text: string; className?: string }) {
  const [open, setOpen] = useState(false);
  const long = text.length > PREVIEW;
  return (
    <div className={className}>
      <p
        id="business-bio"
        className={`max-w-2xl whitespace-pre-line text-sm leading-relaxed text-slate-600 ${long && !open ? "line-clamp-4" : ""}`}
      >
        {text}
      </p>
      {long && (
        <button
          type="button"
          aria-expanded={open}
          aria-controls="business-bio"
          onClick={() => setOpen((v) => !v)}
          className="mt-1 text-sm font-bold text-brand-700 underline-offset-2 hover:underline"
        >
          {open ? "Show less" : "Read more"}
        </button>
      )}
    </div>
  );
}
