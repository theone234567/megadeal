import { ImageResponse } from "next/og";
import { getLogoDataUri, ogLogoHeight } from "@/lib/ogLogo";
import { getOgFonts } from "@/lib/ogFonts";

/**
 * The share image for an advertise page built on IndustryAdvertisePage:
 * the logo, the page's headline and its offer line, as on
 * app/advertise/things-to-do/opengraph-image.tsx.
 */
export const OG_SIZE = { width: 1200, height: 630 };

// Sized to the logo's own proportions (lib/ogLogo.ts).
const LOGO_WIDTH = 620;
const LOGO_HEIGHT = ogLogoHeight(LOGO_WIDTH);

export async function industryOgImage(headline: string, offer: string) {
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
          <img src={logoDataUri} width={LOGO_WIDTH} height={LOGO_HEIGHT} alt="" />
        ) : (
          <span style={{ fontSize: 64, fontWeight: 700, fontFamily: "Fredoka", color: "#6519C7" }}>MegaDeal</span>
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
          {headline}
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
          {offer}
        </div>
      </div>
    ),
    { ...OG_SIZE, fonts }
  );
}
