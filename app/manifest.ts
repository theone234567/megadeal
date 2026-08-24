import type { MetadataRoute } from "next";
import { SITE_NAME } from "@/lib/siteConfig";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${SITE_NAME} — NZ Daily Deals`,
    short_name: SITE_NAME,
    description: "Local deals up to 70% off from real Kiwi businesses.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#7a17f0",
    icons: [{ src: "/icon", sizes: "64x64", type: "image/png" }],
  };
}
