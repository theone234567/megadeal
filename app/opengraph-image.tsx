import { ImageResponse } from "next/og";
import { SITE_DESCRIPTION } from "@/lib/siteConfig";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #7a17f0 0%, #e81ea3 100%)",
          padding: 80,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <span style={{ fontSize: 96, fontWeight: 800, color: "white" }}>Mega</span>
          <span
            style={{
              fontSize: 96,
              fontWeight: 800,
              color: "#7a17f0",
              background: "white",
              borderRadius: 999,
              padding: "0 24px",
              transform: "rotate(-2deg)",
            }}
          >
            Deal
          </span>
          {/* Vector elephant instead of the emoji — Satori composites emoji
              as rasterized Twemoji glyphs, which can leave a faint dark
              fringe around the edges; plain shapes have nothing to fringe. */}
          <svg width="90" height="90" viewBox="0 0 100 100" style={{ marginLeft: 16 }}>
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
        <div
          style={{
            marginTop: 32,
            fontSize: 32,
            color: "white",
            textAlign: "center",
            maxWidth: 900,
          }}
        >
          {SITE_DESCRIPTION}
        </div>
      </div>
    ),
    { ...size }
  );
}
