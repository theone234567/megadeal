import type { MetadataRoute } from "next";
import { SITE_DESCRIPTION, SITE_NAME } from "@/lib/siteConfig";

/**
 * The web app manifest (/manifest.webmanifest): the name, colours and
 * icons a phone uses when the site is added to a home screen. Only the
 * icons the site already has; 192×192 and 512×512 versions (and a maskable
 * one) would let Android show a sharper icon.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${SITE_NAME} – Auckland local deals`,
    short_name: SITE_NAME,
    description: SITE_DESCRIPTION,
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    // The same purple as the browser bar (app/layout.tsx viewport).
    theme_color: "#6D28D9",
    icons: [
      { src: "/icon.png", sizes: "96x96", type: "image/png" },
      { src: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  };
}
