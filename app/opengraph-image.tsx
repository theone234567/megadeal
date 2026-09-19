import { ImageResponse } from "next/og";
import { SITE_DESCRIPTION } from "@/lib/siteConfig";
import { getLogoDataUri } from "@/lib/ogLogo";
import { getOgFonts } from "@/lib/ogFonts";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Real logo file is 2172x724 (≈3:1) — sized to its own ratio rather than a
// fixed height, so it can't come out stretched or squashed.
const LOGO_WIDTH = 760;
const LOGO_HEIGHT = Math.round((LOGO_WIDTH * 724) / 2172);

export default function OpengraphImage() {
  // Both reads degrade independently rather than failing the whole card:
  // no logo falls back to plain text, no fonts falls back to
  // ImageResponse's own generic sans. A missing/unreadable asset should
  // never be the reason a share card doesn't render at all.
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
          <span style={{ fontSize: 80, fontWeight: 700, fontFamily: "Fredoka", color: "#7a17f0" }}>
            MegaDeal
          </span>
        )}
        <div
          style={{
            marginTop: 36,
            fontSize: 32,
            fontFamily: "Plus Jakarta Sans",
            fontWeight: 600,
            color: "#475569",
            textAlign: "center",
            maxWidth: 900,
          }}
        >
          {SITE_DESCRIPTION}
        </div>
      </div>
    ),
    { ...size, fonts }
  );
}
