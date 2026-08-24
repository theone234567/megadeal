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
          <span style={{ fontSize: 80, marginLeft: 16 }}>🐘</span>
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
