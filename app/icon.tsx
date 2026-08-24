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
        <span style={{ fontSize: 38 }}>🐘</span>
      </div>
    ),
    { ...size }
  );
}
