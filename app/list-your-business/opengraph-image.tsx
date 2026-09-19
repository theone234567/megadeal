import { ImageResponse } from "next/og";
import { getLogoDataUri } from "@/lib/ogLogo";

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

export default async function BusinessesOpengraphImage() {
  // Falls back to plain text if the logo fetch ever fails (a network
  // hiccup fetching our own asset) — a share card with no branding at all
  // beats one that fails to render.
  let logoDataUri: string | null = null;
  try {
    logoDataUri = await getLogoDataUri();
  } catch (err) {
    console.error("[opengraph-image] logo fetch failed", err);
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
          background: "linear-gradient(135deg, #7a17f0 0%, #e81ea3 100%)",
          padding: 80,
        }}
      >
        {logoDataUri ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoDataUri} width={LOGO_WIDTH} height={LOGO_HEIGHT} alt="" />
        ) : (
          <span style={{ fontSize: 64, fontWeight: 800, color: "white" }}>MegaDeal</span>
        )}

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
          Up to 6 months free advertising
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
