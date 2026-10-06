import { ImageResponse } from "next/og";
import { getLogoDataUri } from "@/lib/ogLogo";
import { getOgFonts } from "@/lib/ogFonts";
import { SITE_LAUNCHED } from "@/lib/siteConfig";
import { currentPromo } from "@/lib/promo";

// The offer line follows the launch state, as the page does.
const PROMO = currentPromo(SITE_LAUNCHED);

// Route-segment override of the root app/opengraph-image.tsx, same
// reasoning as app/advertise/restaurants/opengraph-image.tsx: without this,
// sharing this page's link showed the generic homepage tagline instead of
// what this specific page offers activity businesses.
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Real logo file is 2172x724 (≈3:1) — sized to its own ratio rather than a
// fixed height, so it can't come out stretched or squashed.
const LOGO_WIDTH = 620;
const LOGO_HEIGHT = Math.round((LOGO_WIDTH * 724) / 2172);

export default async function ThingsToDoOpengraphImage() {
  let logoDataUri: string | null = null;
  try {
    logoDataUri = await getLogoDataUri();
  } catch (err) {
    console.error("[opengraph-image] logo read failed", err);
  }
  let fonts: Awaited<ReturnType<typeof getOgFonts>> = [];
  try {
    fonts = await getOgFonts();
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
            marginTop: 44,
            fontSize: 54,
            fontFamily: "Fredoka",
            fontWeight: 700,
            color: "#1e293b",
            textAlign: "center",
            maxWidth: 1000,
          }}
        >
          Fill more tours, activities &amp; experiences in Auckland.
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
          {`Up to ${PROMO.months} months free advertising for Auckland activity businesses`}
        </div>
      </div>
    ),
    { ...size, fonts }
  );
}
