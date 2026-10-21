import { SITE_LAUNCHED } from "./siteConfig";
import { currentPromo } from "./promo";

/**
 * The Help Centre's answers as plain text: the page's FAQPage structured
 * data (app/help/page.tsx) and /llms-full.txt both read them, so what AI
 * tools quote is what the page says.
 */

// The business answer follows launch: before it, advertising is free (1
// Everyday + 1 Flash Deal at a time, lib/prelaunchAllowance.ts) and the
// offer's months start at launch; after it, pay-as-you-go credits.
const PROMO = currentPromo(SITE_LAUNCHED);
export const BUSINESS_COST = SITE_LAUNCHED
  ? `you advertise with pay-as-you-go credits (eligible new businesses get up to ${PROMO.months} months free), and customers pay you directly when they redeem.`
  : `advertising is free while we prelaunch (1 Everyday Deal and 1 Flash Deal at a time), eligible businesses get up to ${PROMO.months} months free from launch, and customers pay you directly when they redeem. Conditions apply.`;

// Plain-text mirror of the Help page's JSX answers (app/help/page.tsx) —
// duplicated here rather than shared because the JSX versions include
// links (<a>) that don't reduce to clean structured-data text.
export const HELP_FAQ_TEXT = [
  { q: "Do I pay MegaDeal for a deal?", a: "No — MegaDeal never charges customers anything, and there's no voucher to buy. Deals are redeemed and paid for directly with the business, at the discounted price shown on the deal page." },
  { q: "Do I need an account to use MegaDeal?", a: "No — browsing and redeeming deals needs no signup or account at all. Only businesses need to create an account, to list and manage their own deals." },
  { q: "Is my payment information safe?", a: "There's nothing to keep safe — MegaDeal never asks for or stores your card details. You pay the business directly, however they normally take payment, the same as any other in-person or phone purchase." },
  { q: "How do I redeem a deal?", a: "Open the deal page and copy the deal code. Tap \"Contact business\" for the business's phone, email, website and directions, get in touch or visit, quote that code, and pay them at the discounted price." },
  { q: "Do I need to book before using a deal?", a: "It depends on the deal. Each deal page says whether booking is required, recommended or not needed, along with the business's contact details. If booking is required, book ahead and quote your deal code when you do." },
  { q: "How long do I have to use a deal?", a: "Every deal shows its own validity window on the deal page. Once it expires, the business is under no obligation to honour the discounted price." },
  { q: "Can I redeem the same deal more than once?", a: "Deals are for genuine personal use — unless a listing says otherwise, that's one redemption per person. A business can decline to honour a deal it reasonably believes is being reused or resold." },
  { q: "How do I know a business is legitimate?", a: "Every business is reviewed by our team before their first deal goes live — we don't publish listings automatically." },
  { q: "What do \"Business verified\" and \"Checked\" mean on a deal?", a: "Every deal page says who stands behind it. \"Business verified\" means the business has its own MegaDeal account and our team approved the deal. \"Listed by MegaDeal\" means our team approved it but the business hasn't set up its account yet. \"Checked\" is when our team last approved the deal, or when the business last confirmed it's still running as listed; \"Updated\" is when anything on the deal last changed. Deal end dates are real: we never show a fake countdown." },
  { q: "What if a business won't honour a deal?", a: "First check the deal hasn't expired and that you've met its conditions, such as booking ahead. If a business still won't honour a current deal, use the \"Deal not honoured? Tell us\" link on the deal page, or our contact page, and our team will look into it." },
  { q: "Can I get a refund?", a: "Since MegaDeal never charges you, there's nothing for us to refund. Payment and any resulting dispute is between you and the business." },
  { q: "Is Groupon still in New Zealand?", a: "No. Groupon closed its New Zealand business in 2020, and MegaDeal isn't connected with it. MegaDeal is a New Zealand-owned local deals site, starting in Auckland. It works differently: there's no voucher to buy. You get a free deal code, contact the business, and pay them directly at the deal price." },
  { q: "How do I stop MegaDeal emails?", a: "Every MegaDeal email that isn't about your account has an Unsubscribe link at the bottom: one click and those emails stop. Businesses can also choose which MegaDeal emails they get under \"Emails from MegaDeal\" in the business portal. Emails about your account and your deals, like sign-in codes and approvals, always come." },
  { q: "I'm a business — how do I list a deal?", a: `Head to our business page to find out how listing works — ${BUSINESS_COST}` },
];
