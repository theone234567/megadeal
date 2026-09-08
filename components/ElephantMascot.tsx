"use client";

import { useCallback, useId, useRef, useState } from "react";

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
 * The MegaDeal elephant: a cute, front-facing baby-elephant face (big round
 * head, two big symmetric ears, a soft swinging trunk, big eyes, blush
 * cheeks, tiny tusks) sized to sit alongside the wordmark rather than
 * dominate it. Sways gently on its own, and jumps + flaps + toots with a
 * sparkle burst and a speech bubble whenever it's tapped or clicked.
 */
export default function ElephantMascot({ className = "" }: { className?: string }) {
  const gradientId = useId();
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
      className={`relative shrink-0 select-none rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 ${className}`}
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
        className={`h-10 w-10 drop-shadow-md sm:h-11 sm:w-11 ${
          isDoingTrick ? "animate-elephant-trick-body" : "animate-elephant-idle-body"
        }`}
      >
        <defs>
          <linearGradient id={`${gradientId}-body`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#a35cff" />
            <stop offset="100%" stopColor="#7a17f0" />
          </linearGradient>
        </defs>

        {/* both ears, big and symmetric — the single clearest "elephant" cue */}
        <g
          style={{ transformBox: "fill-box" as any }}
          className={isDoingTrick ? "animate-elephant-trick-ear" : "animate-elephant-idle-ear"}
        >
          <ellipse cx="15" cy="48" rx="17" ry="22" fill="#c194ff" />
          <ellipse cx="18" cy="48" rx="10" ry="14" fill="#ffb8e8" />
          <ellipse cx="85" cy="48" rx="17" ry="22" fill="#c194ff" />
          <ellipse cx="82" cy="48" rx="10" ry="14" fill="#ffb8e8" />
        </g>

        {/* head */}
        <ellipse cx="50" cy="45" rx="30" ry="28" fill={`url(#${gradientId}-body)`} />

        {/* blush cheeks */}
        <ellipse cx="26" cy="56" rx="6" ry="4" fill="#ff9ed6" opacity="0.65" />
        <ellipse cx="74" cy="56" rx="6" ry="4" fill="#ff9ed6" opacity="0.65" />

        {/* tusks */}
        <ellipse cx="41" cy="66" rx="3.6" ry="7" fill="#fffaf3" transform="rotate(-12 41 66)" />
        <ellipse cx="59" cy="66" rx="3.6" ry="7" fill="#fffaf3" transform="rotate(12 59 66)" />

        {/* trunk: soft downward swing, unmistakably an elephant's */}
        <path
          d="M50 58 C 45 70, 55 78, 50 90"
          fill="none"
          stroke={`url(#${gradientId}-body)`}
          strokeWidth={13}
          strokeLinecap="round"
          className={isDoingTrick ? "animate-elephant-trick-trunk" : ""}
          style={{ transformBox: "fill-box" as any }}
        />

        {/* eyes */}
        <circle cx="36" cy="40" r="6" fill="#211033" />
        <circle cx="38.2" cy="37.8" r="2" fill="#ffffff" />
        <circle cx="64" cy="40" r="6" fill="#211033" />
        <circle cx="66.2" cy="37.8" r="2" fill="#ffffff" />
      </svg>
    </button>
  );
}
