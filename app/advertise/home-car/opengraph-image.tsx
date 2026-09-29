import { ImageResponse } from "next/og";
import { getLogoDataUri } from "@/lib/ogLogo";
import { getOgFonts } from "@/lib/ogFonts";

// Route-segment override of the root app/opengraph-image.tsx, same
// reasoning as app/advertise/restaurants/opengraph-image.tsx: a shared link
// shows what this page offers home-service and automotive businesses.
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Real logo file is 2172x724 (≈3:1) — sized to its own ratio rather than a
// fixed height, so it can't come out stretched or squashed.
const LOGO_WIDTH = 620;
const LOGO_HEIGHT = Math.round((LOGO_WIDTH * 724) / 2172);

export default function HomeCarOpengraphImage() {
  let logoDataUri: string | null = null;
  try {
    logoDataUri = getLogoDataUri();
  } catch (err) {
    console.error("[opengraph-image] logo read failed", err);
  }
  let fonts: ReturnType<typeof getOgFonts> = [];
  try {
    fonts = getOgFonts();
  } catch (err) {
    console.error("[opengraph-image] font read failed", err);
  }

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
          background: "#ffffff",
          padding: 80,
        }}
      >
        {logoDataUri ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoDataUri} width={LOGO_WIDTH} height={LOGO_HEIGHT} alt="" />
        ) : (
          <span style={{ fontSize: 64, fontWeight: 700, fontFamily: "Fredoka", color: "#6519C7" }}>
            MegaDeal
          </span>
        )}

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            marginTop: 44,
            fontSize: 54,
            fontFamily: "Fredoka",
            fontWeight: 700,
            color: "#1e293b",
            textAlign: "center",
            maxWidth: 1000,
          }}
        >
          <span>More local jobs.</span>
          <span>More reasons to choose you.</span>
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 20,
            fontSize: 30,
            fontFamily: "Plus Jakarta Sans",
            fontWeight: 600,
            color: "#475569",
            textAlign: "center",
          }}
        >
          Business advertising for Auckland home &amp; car services
        </div>
      </div>
    ),
    { ...size, fonts }
  );
}
