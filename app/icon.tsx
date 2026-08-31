import { ImageResponse } from "next/og";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 14,
          background: "linear-gradient(135deg, #7a17f0 0%, #e81ea3 100%)",
        }}
      >
        {/* Vector elephant instead of the 🐘 emoji: Satori composites emoji
            as rasterized Twemoji glyphs, which leaves a faint dark fringe
            around the edges — most visible once a browser downscales this
            to a 16-32px tab favicon. Plain shapes have nothing to fringe. */}
        <svg width="46" height="46" viewBox="0 0 100 100">
          <ellipse cx="15" cy="48" rx="17" ry="22" fill="#eee0ff" />
          <ellipse cx="85" cy="48" rx="17" ry="22" fill="#eee0ff" />
          <ellipse cx="50" cy="45" rx="30" ry="28" fill="#f7f2ff" />
          <path
            d="M50 58 C 45 70, 55 78, 50 90"
            fill="none"
            stroke="#f7f2ff"
            strokeWidth="13"
            strokeLinecap="round"
          />
          <circle cx="36" cy="40" r="6" fill="#440e82" />
          <circle cx="64" cy="40" r="6" fill="#440e82" />
        </svg>
      </div>
    ),
    { ...size }
  );
}
