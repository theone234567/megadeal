"use client";

import { useEffect, useState } from "react";

export default function ShareButtons({
  title,
  className = "",
}: {
  title: string;
  className?: string;
}) {
  const [url, setUrl] = useState("");
  const [canNativeShare, setCanNativeShare] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setUrl(window.location.href);
    setCanNativeShare(typeof navigator !== "undefined" && Boolean((navigator as any).share));
  }, []);

  if (!url) return null;

  async function nativeShare() {
    try {
      await (navigator as any).share({ title, url });
    } catch {
      // User cancelled the share sheet — nothing to do.
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access can be denied — the copy button just won't confirm.
    }
  }

  if (canNativeShare) {
    return (
      <button
        type="button"
        onClick={nativeShare}
        className={`flex items-center gap-1.5 text-xs font-semibold text-slate-500 transition hover:text-brand-600 ${className}`}
      >
        <span aria-hidden>🔗</span> Share this deal
      </button>
    );
  }

  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);
  const btnClass =
    "flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:border-brand-400 hover:text-brand-600";

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className="text-xs font-semibold text-slate-500">Share:</span>
      <a
        href={`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Share on Facebook"
        className={btnClass}
      >
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className="h-4 w-4">
          <path d="M14 13.5h2.5l1-4H14v-2c0-1.03 0-2 2-2h1.5V2.14c-.326-.043-1.557-.14-2.857-.14C11.928 2 10 3.657 10 6.7v2.8H7v4h3V22h4v-8.5Z" />
        </svg>
      </a>
      <a
        href={`https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Share on X"
        className={btnClass}
      >
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className="h-3.5 w-3.5">
          <path d="M18.9 2H22l-7.6 8.7L23 22h-6.9l-5.4-6.6L4.5 22H1.3l8.1-9.3L1 2h7l4.9 6.1L18.9 2Zm-1.2 18h1.7L6.4 4H4.6l13.1 16Z" />
        </svg>
      </a>
      <a
        href={`https://wa.me/?text=${encodedTitle}%20${encodedUrl}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Share on WhatsApp"
        className={btnClass}
      >
        <span aria-hidden className="text-sm">
          💬
        </span>
      </a>
      <button type="button" onClick={copyLink} aria-label="Copy link" className={btnClass}>
        <span aria-hidden className="text-sm">
          {copied ? "✓" : "🔗"}
        </span>
      </button>
    </div>
  );
}
