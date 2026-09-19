import { ImageResponse } from "next/og";
import { getLogoDataUri } from "@/lib/ogLogo";
import { getOgFonts } from "@/lib/ogFonts";

// Route-segment override of the root app/opengraph-image.tsx — Next.js
// picks this one for any /list-your-business URL instead of the generic
// site-wide share image, so a link to this page shows what it's actually
// about (the free-advertising offer) rather than the generic homepage
// tagline.
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Real logo file is 2172x724 (≈3:1) — sized to its own ratio rather than a
// fixed height, so it can't come out stretched or squashed.
const LOGO_WIDTH = 620;
const LOGO_HEIGHT = Math.round((LOGO_WIDTH * 724) / 2172);

export default function BusinessesOpengraphImage() {
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
          position: "relative",
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
          <span style={{ fontSize: 64, fontWeight: 700, fontFamily: "Fredoka", color: "#7a17f0" }}>
            MegaDeal
          </span>
        )}

        <div
          style={{
            display: "flex",
            marginTop: 44,
            fontSize: 58,
            fontFamily: "Fredoka",
            fontWeight: 700,
            color: "#1e293b",
            textAlign: "center",
            maxWidth: 980,
          }}
        >
          Up to 6 months free advertising
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 20,
            fontSize: 32,
            fontFamily: "Plus Jakarta Sans",
            fontWeight: 600,
            color: "#475569",
            textAlign: "center",
          }}
        >
          Zero commission. List your NZ business deal today.
        </div>

        {/* Same "conditions apply" convention the footer's own free-
            advertising CTA already uses (components/Footer.tsx) — the offer
            is real but has eligibility terms, and this is often the only
            part of the page someone actually sees before deciding to click. */}
        <div
          style={{
            display: "flex",
            position: "absolute",
            bottom: 48,
            fontSize: 22,
            fontFamily: "Plus Jakarta Sans",
            fontWeight: 600,
            color: "#94a3b8",
          }}
        >
          Conditions apply
        </div>
      </div>
    ),
    { ...size, fonts }
  );
}
