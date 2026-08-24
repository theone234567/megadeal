"use client";

import { useCallback, useEffect, useRef, useState } from "react";

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
 * The MegaDeal elephant: sways gently on its own, and jumps + flaps + toots
 * with a sparkle burst and a speech bubble whenever it's tapped or clicked —
 * a shareable, no-assets brand flourish for the header.
 */
export default function ElephantMascot({ className = "" }: { className?: string }) {
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
        viewBox="0 0 64 64"
        className={`h-16 w-16 drop-shadow-md sm:h-[4.5rem] sm:w-[4.5rem] ${
          isDoingTrick ? "animate-elephant-trick-body" : "animate-elephant-idle-body"
        }`}
      >
        <defs>
          <linearGradient id="elephant-body" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#a35cff" />
            <stop offset="100%" stopColor="#7a17f0" />
          </linearGradient>
          <linearGradient id="elephant-ear" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#dcc2ff" />
            <stop offset="100%" stopColor="#c194ff" />
          </linearGradient>
        </defs>

        {/* tail */}
        <path
          d="M14 34c-4 0-6 3-5 6"
          fill="none"
          stroke="#650fc7"
          strokeWidth={2.5}
          strokeLinecap="round"
        />
        {/* legs */}
        <rect x="20" y="46" width="6" height="10" rx="3" fill="#650fc7" />
        <rect x="38" y="46" width="6" height="10" rx="3" fill="#650fc7" />
        {/* ear */}
        <g
          style={{ transformBox: "fill-box" as any }}
          className={isDoingTrick ? "animate-elephant-trick-ear" : "animate-elephant-idle-ear"}
        >
          <circle cx="44" cy="26" r="11" fill="url(#elephant-ear)" />
          <circle cx="44" cy="26" r="6.5" fill="#ffb8e8" />
        </g>
        {/* body */}
        <ellipse cx="30" cy="34" rx="18" ry="15" fill="url(#elephant-body)" />
        {/* belly */}
        <ellipse cx="28" cy="38" rx="10" ry="8" fill="#f7f2ff" />
        {/* head */}
        <circle cx="22" cy="24" r="12" fill="url(#elephant-body)" />
        {/* eye */}
        <circle cx="19" cy="22" r="2" fill="#211033" />
        <circle cx="19.7" cy="21.3" r="0.7" fill="#ffffff" />
        {/* trunk */}
        <path
          d="M14 26c-3 1-5 4-4.5 8s3 5 5.5 4"
          fill="none"
          stroke="#8b2cff"
          strokeWidth={5}
          strokeLinecap="round"
          className={isDoingTrick ? "animate-elephant-trick-trunk" : ""}
          style={{ transformBox: "fill-box" as any }}
        />
        {/* smile */}
        <path
          d="M15 30c2 2 5 2 7 0"
          fill="none"
          stroke="#211033"
          strokeWidth={1.4}
          strokeLinecap="round"
        />
      </svg>
    </button>
  );
}
