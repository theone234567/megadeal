import { ImageResponse } from "next/og";

// Route-segment override of the root app/opengraph-image.tsx — Next.js
// picks this one for any /businesses URL instead of the generic site-wide
// share image, so a link to this page shows what it's actually about
// (the free-advertising offer) rather than the generic homepage tagline.
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function BusinessesOpengraphImage() {
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
          <span style={{ fontSize: 64, fontWeight: 800, color: "white" }}>Mega</span>
          <span
            style={{
              fontSize: 64,
              fontWeight: 800,
              color: "#7a17f0",
              background: "white",
              borderRadius: 999,
              padding: "0 18px",
              transform: "rotate(-2deg)",
            }}
          >
            Deal
          </span>
          <svg width="60" height="60" viewBox="0 0 100 100" style={{ marginLeft: 12 }}>
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
            display: "flex",
            marginTop: 40,
            fontSize: 60,
            fontWeight: 800,
            color: "white",
            textAlign: "center",
            maxWidth: 980,
          }}
        >
          Up to 3 months free advertising
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 20,
            fontSize: 32,
            fontWeight: 600,
            color: "#f7e6fb",
            textAlign: "center",
          }}
        >
          Zero commission. List your NZ business deal today.
        </div>
      </div>
    ),
    { ...size }
  );
}
