import type { MetadataRoute } from "next";
import { SITE_DESCRIPTION, SITE_NAME } from "@/lib/siteConfig";

/**
 * The web app manifest (/manifest.webmanifest): the name, colours and
 * icons a phone, Edge or Bing uses for the site. 192 and 512 sizes (and a
 * maskable one, full-bleed purple with the elephant inside the safe area,
 * for Android's shaped icons) are in public/brand, rendered from
 * public/brand/minimal/*.svg.
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
      { src: "/brand/megadeal-icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/brand/megadeal-icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/brand/megadeal-icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
