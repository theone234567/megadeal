"use client";

import { useCallback, useRef, useState } from "react";

interface Sparkle {
  id: number;
  emoji: string;
  x: number;
}

const TRICK_EMOJIS = ["✨", "🎉", "🥁", "🎺", "⭐️"];
const TRICK_MESSAGES = [
  "Toot toot! 🎺",
  "Tell ya mates!",
  "Deals incoming!",
  "Boop confirmed 🐘",
  "Sniffed out a bargain!",
];
const TRICK_MS = 950;
const BUBBLE_MS = 1500;

let sparkleId = 0;

/**
 * The MegaDeal icon: a flat elephant silhouette on a rounded gradient
 * badge — the exact shape and colors already used for the favicon and
 * OG image (app/icon.tsx, app/opengraph-image.tsx), reused here instead
 * of a third, separately-drawn version, so the header, browser tab, and
 * shared-link previews all show the same mark. Keeps the tap-to-boop
 * personality (sparkles, speech bubble, stomp/wiggle) from the previous
 * header mascot — only the art was simplified, not the interaction.
 */
export default function ElephantBadge({ className = "" }: { className?: string }) {
  const [isDoingTrick, setIsDoingTrick] = useState(false);
  const [sparkles, setSparkles] = useState<Sparkle[]>([]);
  const [bubble, setBubble] = useState<{ id: number; text: string } | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const bubbleTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const doTrick = useCallback(() => {
    if (isDoingTrick) return;
    setIsDoingTrick(true);

    const burst: Sparkle[] = Array.from({ length: 4 }, () => ({
      id: sparkleId++,
      emoji: TRICK_EMOJIS[Math.floor(Math.random() * TRICK_EMOJIS.length)],
      x: Math.round((Math.random() - 0.5) * 40),
    }));
    setSparkles(burst);
    setBubble({
      id: sparkleId++,
      text: TRICK_MESSAGES[Math.floor(Math.random() * TRICK_MESSAGES.length)],
    });

    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setIsDoingTrick(false);
      setSparkles([]);
    }, TRICK_MS);

    clearTimeout(bubbleTimeoutRef.current);
    bubbleTimeoutRef.current = setTimeout(() => setBubble(null), BUBBLE_MS);
  }, [isDoingTrick]);

  return (
    <button
      type="button"
      onClick={doTrick}
      aria-label="Boop the MegaDeal elephant"
      className={`relative flex shrink-0 select-none items-center justify-center rounded-xl bg-gradient-to-br from-brand-600 to-ember-500 p-1.5 shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 ${className}`}
    >
      {bubble && (
        <span
          key={bubble.id}
          className="animate-elephant-bubble pointer-events-none absolute left-1/2 top-full z-10 mt-2 -translate-x-1/2 whitespace-nowrap rounded-full bg-slate-900 px-3 py-1 text-xs font-bold text-white shadow-card after:absolute after:bottom-full after:left-1/2 after:-ml-1 after:border-4 after:border-transparent after:border-b-slate-900"
        >
          {bubble.text}
        </span>
      )}

      {sparkles.map((s) => (
        <span
          key={s.id}
          className="animate-elephant-sparkle pointer-events-none absolute left-1/2 top-1 text-sm"
          style={{ ["--sparkle-x" as any]: `${s.x}px` }}
        >
          {s.emoji}
        </span>
      ))}

      <svg
        viewBox="0 0 100 100"
        className={`h-full w-full ${
          isDoingTrick ? "animate-elephant-trick-body" : "animate-elephant-idle-body"
        }`}
      >
        <g
          style={{ transformBox: "fill-box" as any }}
          className={isDoingTrick ? "animate-elephant-trick-ear" : "animate-elephant-idle-ear"}
        >
          <ellipse cx="15" cy="48" rx="17" ry="22" fill="#eee0ff" />
          <ellipse cx="85" cy="48" rx="17" ry="22" fill="#eee0ff" />
        </g>
        <ellipse cx="50" cy="45" rx="30" ry="28" fill="#f7f2ff" />
        <path
          d="M50 58 C 45 70, 55 78, 50 90"
          fill="none"
          stroke="#f7f2ff"
          strokeWidth={13}
          strokeLinecap="round"
          className={isDoingTrick ? "animate-elephant-trick-trunk" : ""}
          style={{ transformBox: "fill-box" as any }}
        />
        <circle cx="36" cy="40" r="6" fill="#440e82" />
        <circle cx="64" cy="40" r="6" fill="#440e82" />
      </svg>
    </button>
  );
}
