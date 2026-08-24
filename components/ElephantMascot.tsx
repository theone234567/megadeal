"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";

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
const HINT_MS = 4200;

let sparkleId = 0;

/**
 * The MegaDeal elephant: a clearly-readable trumpeting elephant (big fan
 * ear, curled raised trunk) that sways gently on its own, and jumps + flaps
 * + toots with a sparkle burst and a speech bubble whenever it's tapped or
 * clicked — a shareable, no-assets brand flourish for the header.
 */
export default function ElephantMascot({ className = "" }: { className?: string }) {
  const gradientId = useId();
  const [isDoingTrick, setIsDoingTrick] = useState(false);
  const [sparkles, setSparkles] = useState<Sparkle[]>([]);
  const [bubble, setBubble] = useState<{ id: number; text: string } | null>(null);
  const [showHint, setShowHint] = useState(true);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const bubbleTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    const t = setTimeout(() => setShowHint(false), HINT_MS);
    return () => clearTimeout(t);
  }, []);

  const doTrick = useCallback(() => {
    setShowHint(false);
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
      {showHint && (
        <span className="animate-elephant-hint pointer-events-none absolute inset-0 rounded-full border-2 border-ember-400" />
      )}

      {bubble && (
        <span
          key={bubble.id}
          className="animate-elephant-bubble pointer-events-none absolute -top-9 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-full bg-slate-900 px-3 py-1 text-xs font-bold text-white shadow-card after:absolute after:left-1/2 after:top-full after:-ml-1 after:border-4 after:border-transparent after:border-t-slate-900"
        >
          {bubble.text}
        </span>
      )}

      {sparkles.map((s) => (
        <span
          key={s.id}
          className="animate-elephant-sparkle pointer-events-none absolute left-1/2 top-1 text-base"
          style={{ ["--sparkle-x" as any]: `${s.x}px` }}
        >
          {s.emoji}
        </span>
      ))}

      <svg
        viewBox="0 0 120 120"
        className={`h-16 w-16 drop-shadow-md sm:h-[4.5rem] sm:w-[4.5rem] ${
          isDoingTrick ? "animate-elephant-trick-body" : "animate-elephant-idle-body"
        }`}
      >
        <defs>
          <linearGradient id={`${gradientId}-body`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#a35cff" />
            <stop offset="100%" stopColor="#7a17f0" />
          </linearGradient>
        </defs>

        {/* tail */}
        <path
          d="M24 58c-7 -1 -11 4 -9 9"
          fill="none"
          stroke="#650fc7"
          strokeWidth={4.5}
          strokeLinecap="round"
        />
        <circle cx="15" cy="68" r="3.4" fill="#650fc7" />
        {/* legs */}
        <rect x="32" y="86" width="13" height="20" rx="6" fill="#650fc7" />
        <rect x="68" y="86" width="13" height="20" rx="6" fill="#650fc7" />
        {/* ear (fan-shaped, unmistakably elephant) */}
        <g
          style={{ transformBox: "fill-box" as any }}
          className={isDoingTrick ? "animate-elephant-trick-ear" : "animate-elephant-idle-ear"}
        >
          <path
            d="M70 30c17-12 36-4 36 12s-14 26-30 21c-8-3-13-13-11-21 1-6 2-9 5-12z"
            fill="#c194ff"
          />
          <path
            d="M74 34c11-8 24-3 24 8s-9 17-19 14c-5-2-9-9-7-14 1-4 1-6 2-8z"
            fill="#ffb8e8"
          />
        </g>
        {/* body */}
        <ellipse cx="52" cy="68" rx="35" ry="28" fill={`url(#${gradientId}-body)`} />
        {/* belly */}
        <ellipse cx="46" cy="77" rx="18" ry="15" fill="#f7f2ff" />
        {/* head */}
        <circle cx="82" cy="42" r="25" fill={`url(#${gradientId}-body)`} />
        {/* far ear peeking out */}
        <path
          d="M64 24c-17-6-31 3-31 17s15 23 28 18c8-3 11-13 9-21-1-6-3-10-6-14z"
          fill="#dcc2ff"
        />
        {/* trunk: raised and curled, unmistakably trumpeting */}
        <path
          d="M96 50
             C111 41 124 45 124 30
             C124 19 113 15 105 22
             C111 22 116 28 113 34
             C107 30 100 33 98 40
             C103 40 105 44 101 48
             C99 50 97 51 96 50 Z"
          fill={`url(#${gradientId}-body)`}
          className={isDoingTrick ? "animate-elephant-trick-trunk" : ""}
          style={{ transformBox: "fill-box" as any }}
        />
        {/* smile */}
        <path
          d="M79 52c3.4 3.2 9 3.2 12.4 0"
          fill="none"
          stroke="#211033"
          strokeWidth={2.4}
          strokeLinecap="round"
        />
        {/* eye */}
        <circle cx="88" cy="36" r="4.6" fill="#211033" />
        <circle cx="89.8" cy="34.2" r="1.6" fill="#ffffff" />
      </svg>
    </button>
  );
}
