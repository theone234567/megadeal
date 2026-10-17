import { industryOgImage } from "@/components/business/industryOgImage";
import { SITE_LAUNCHED } from "@/lib/siteConfig";
import { currentPromo } from "@/lib/promo";

// This page's own share image, so a shared link shows what it offers, not
// the homepage's tagline. The offer line follows the launch state.
const PROMO = currentPromo(SITE_LAUNCHED);

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return industryOgImage("Fill more classes & sessions in Auckland.", `Up to ${PROMO.months} months free advertising for Auckland fitness businesses`);
}
