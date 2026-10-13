import { feedOpenApi } from "@/lib/feedOpenApi";
import { SITE_NAME, SITE_URL } from "@/lib/siteConfig";

/** The deals feed's OpenAPI description (lib/feedOpenApi.ts). The same
 *  for every request, so built once. */
export const dynamic = "force-static";

export function GET() {
  return new Response(JSON.stringify(feedOpenApi(SITE_URL, SITE_NAME), null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=3600",
      "X-Robots-Tag": "noindex",
    },
  });
}
