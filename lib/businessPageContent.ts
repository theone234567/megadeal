import { currentPromo } from "./promo";

/**
 * Copy for the redesigned /list-your-business (LIST_BUSINESS_DESIGN=v2),
 * from the Business Page pack (src/content.json, 4 Oct 2026), word for
 * word before launch. After launch the pre-launch offer is over, so the
 * hero, qualifier and offer FAQs follow the launch offer the site already
 * uses (lib/promo.ts: WELCOME3, up to 3 months) instead of a cached
 * "6 months" promise. Nothing here grants anything: the promo and its
 * eligibility are decided on the server at approval.
 */

export interface BusinessPageCopy {
  eyebrow: string;
  /** The h1 as one sentence, and as its two lines: the first in ink,
   *  the second in purple (as on the Beauty & Spa hero). */
  headline: string;
  headlineLead: string;
  headlineAccent: string;
  subheading: string;
  intro: string;
  heroCta: string;
  offerQualifier: string;
  /** Before launch only. */
  launchNote: string | null;
  benefits: [string, string][];
  steps: [string, string][];
  dealNote: string;
  signupHeading: string;
  reassurances: string[];
  /** "Who can join", as three lines: who's welcome, what's welcome, who isn't. */
  eligibleFor: string;
  bookingClarification: string;
  notEligible: string;
  companyEligibility: string;
  faqs: { question: string; answer: string }[];
}

const SHARED = {
  eyebrow: "FOR AUCKLAND BUSINESSES",
  subheading: "Fill quiet times. Reach more local customers.",
  intro: "Customers book and pay you directly. MegaDeal takes 0% commission.",
  heroCta: "Create your business account",
  benefits: [
    ["Reach local customers", "Help people in Auckland discover your business."],
    ["Choose your availability", "You decide when your offer is available."],
    ["0% commission", "Customers book and pay you directly."],
  ] as [string, string][],
  steps: [
    ["Sign up", "Enter your details and tell us about your business."],
    ["Complete your profile", "Add your photos, location and booking options."],
    ["Create and preview deals", "Choose your offer, availability and conditions."],
  ] as [string, string][],
  dealNote: "Choose an Everyday Deal for an ongoing offer, or a Flash Deal for a short promotion.",
  signupHeading: "Let’s get your business ready.",
  reassurances: ["No credit card required to sign up.", "No lock-in contracts.", "Cancel anytime."],
  eligibleFor: "Local services, experiences and hospitality.",
  bookingClarification: "Online bookings and payments for eligible local services are welcome.",
  notEligible: "E-commerce retail and adult businesses are not eligible.",
  companyEligibility: "Currently accepting New Zealand registered limited companies.",
};

const FAQ_AFTER_FREE_PERIOD = {
  question: "What happens after my free period?",
  answer:
    "You can choose whether to continue advertising using pay-as-you-go credits. We’ll confirm the cost with you before you buy any. There’s no lock-in contract, and you can stop advertising at any time.",
};
const FAQ_BOOK_AND_PAY = {
  question: "How do customers book and pay?",
  answer:
    "Customers book or contact your business directly using the options you provide, such as your booking link, website or phone number. Walk-ins are welcome where your offer allows them. Customers pay your business directly—MegaDeal does not process their payments or take a commission.",
};
const FAQ_DISCOUNT = {
  question: "Do I need to offer a big discount?",
  answer:
    "No. Your offer could be a discount, a complimentary extra, a package or an upgrade. It needs to provide genuine value. You choose the availability and conditions that work for your business.",
};
const FAQ_WHO = {
  question: "Which businesses can join?",
  answer:
    "MegaDeal is for local services, experiences and hospitality. E-commerce retail and adult businesses are not eligible. Eligible local businesses can still use their own websites for bookings and payments. We currently accept New Zealand registered limited companies.",
};

export function businessPageCopy(launched: boolean): BusinessPageCopy {
  if (!launched) {
    return {
      ...SHARED,
      headline: "Up to 6 months free advertising.",
      headlineLead: "Up to 6 months",
      headlineAccent: "free advertising.",
      offerQualifier: "For eligible pre-launch businesses. Terms and conditions apply.",
      launchNote: "Your free advertising starts when MegaDeal goes live.",
      faqs: [
        {
          question: "How does the free advertising offer work?",
          answer:
            "Eligible businesses that sign up before launch can receive up to six months of free advertising. Your free advertising period starts when MegaDeal goes live to customers, not when you sign up. No credit card is required to sign up. Offer terms and conditions apply.",
        },
        FAQ_AFTER_FREE_PERIOD,
        FAQ_BOOK_AND_PAY,
        FAQ_DISCOUNT,
        FAQ_WHO,
        {
          question: "Can I get everything ready before launch?",
          answer:
            "Yes. You can complete your business profile, create your offers and preview how they’ll look before they go live. MegaDeal is launching in Auckland first.",
        },
      ],
    };
  }
  // After launch: the pre-launch offer has ended; the current one is the
  // launch offer (lib/promo.ts).
  const promo = currentPromo(true);
  return {
    ...SHARED,
    headline: SHARED.subheading,
    headlineLead: "Fill quiet times.",
    headlineAccent: "Reach more local customers.",
    subheading: `Up to ${promo.months} months free advertising for new businesses.`,
    offerQualifier: "For eligible businesses. Terms and conditions apply.",
    launchNote: null,
    faqs: [
      {
        question: "How does the free advertising offer work?",
        answer: `Eligible new businesses can receive up to ${promo.months} months of free advertising. No credit card is required to sign up. Offer terms and conditions apply.`,
      },
      FAQ_AFTER_FREE_PERIOD,
      FAQ_BOOK_AND_PAY,
      FAQ_DISCOUNT,
      FAQ_WHO,
    ],
  };
}

/** Where "Terms and conditions apply" points: the businesses section of
 *  the terms, which holds the free-advertising offer and credit rules. */
export const OFFER_TERMS_HREF = "/terms#businesses";
