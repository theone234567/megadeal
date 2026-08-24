"use client";

import { useCallback, useRef, useState } from "react";

interface Sparkle {
  id: number;
  emoji: string;
  x: number;
}

const TRICK_EMOJIS = ["✨", "🎉", "🥁", "🎺", "⭐️"];
const TRICK_MS = 900;

let sparkleId = 0;

/**
 * A small purple elephant that sways gently by itself, and does a jump +
 * ear-flap + trunk-toot "trick" whenever it's tapped or clicked — purely
 * decorative brand flourish, no external assets.
 */
export default function ElephantMascot({ className = "" }: { className?: string }) {
  const [isDoingTrick, setIsDoingTrick] = useState(false);
  const [sparkles, setSparkles] = useState<Sparkle[]>([]);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const doTrick = useCallback(() => {
    if (isDoingTrick) return;
    setIsDoingTrick(true);

    const burst: Sparkle[] = Array.from({ length: 3 }, () => ({
      id: sparkleId++,
      emoji: TRICK_EMOJIS[Math.floor(Math.random() * TRICK_EMOJIS.length)],
      x: Math.round((Math.random() - 0.5) * 28),
    }));
    setSparkles(burst);

    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setIsDoingTrick(false);
      setSparkles([]);
    }, TRICK_MS);
  }, [isDoingTrick]);

  return (
    <button
      type="button"
      onClick={doTrick}
      aria-label="Boop the MegaDeal elephant"
      className={`relative shrink-0 select-none rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 ${className}`}
    >
      {sparkles.map((s) => (
        <span
          key={s.id}
          className="animate-elephant-sparkle pointer-events-none absolute left-1/2 top-0 text-sm"
          style={{ ["--sparkle-x" as any]: `${s.x}px` }}
        >
          {s.emoji}
        </span>
      ))}

      <svg
        viewBox="0 0 64 64"
        className={`h-9 w-9 ${isDoingTrick ? "animate-elephant-trick-body" : "animate-elephant-idle-body"}`}
      >
        {/* tail */}
        <path
          d="M14 34c-4 0-6 3-5 6"
          fill="none"
          stroke="#7a17f0"
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
          <circle cx="44" cy="26" r="11" fill="#c194ff" />
          <circle cx="44" cy="26" r="6.5" fill="#ffb8e8" />
        </g>
        {/* body */}
        <ellipse cx="30" cy="34" rx="18" ry="15" fill="#8b2cff" />
        {/* belly */}
        <ellipse cx="28" cy="38" rx="10" ry="8" fill="#f7f2ff" />
        {/* head */}
        <circle cx="22" cy="24" r="12" fill="#8b2cff" />
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
