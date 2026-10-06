import { SOCIAL_URLS } from "@/components/SocialLinks";

/**
 * Copy and photo choices for the coming-soon page's V2 design (the
 * "Coming Soon" pack of 3 Oct 2026), kept in one place so wording and
 * photos can be swapped without touching layout.
 *
 * Deliberately absent (owner's decision): "free to join", "early access"
 * and any "approved / reviewed / verified business" claim. Nothing here
 * creates a consumer account; the email form is optional launch updates.
 */

export const V2_TITLE = "Auckland Local Deals Coming Soon";
export const V2_DESCRIPTION =
  "MegaDeal is launching in Auckland. Discover local offers, get a deal code and book or buy directly with the business. Sign up for launch updates.";

/** The site's existing, verified profiles (components/SocialLinks.tsx). */
export const V2_SOCIALS = {
  instagram: SOCIAL_URLS.find((u) => u.includes("instagram"))!,
  facebook: SOCIAL_URLS.find((u) => u.includes("facebook"))!,
  tiktok: SOCIAL_URLS.find((u) => u.includes("tiktok"))!,
};

/**
 * Photos. Categories and the example deal are the owner's "MegaDeal
 * Website Images" pack (3 Oct 2026): AI-generated illustrations, not
 * participating businesses, served from public/megadeal-coming-soon with
 * versioned names (bump -v1 if the bytes ever change). Masters stay out of
 * the site, in the owner's pack.
 *
 * Hero: the pack's brighter illustrated skyline (owner's choice, 3 Oct
 * 2026, over the real photo the homepage uses,
 * /megadeal/hero/auckland-skyline.webp). Positioned to keep the Sky Tower
 * and waterfront in the short phone crop.
 */
export const V2_HERO = {
  src: "/megadeal-coming-soon/auckland-hero-v1.webp",
  /** Smaller copies of the same picture (images aren't resized on the fly,
   *  next.config.mjs), so a phone downloads 40KB instead of 150KB. */
  srcSet:
    "/megadeal-coming-soon/auckland-hero-v1-640w.webp 640w, /megadeal-coming-soon/auckland-hero-v1-1012w.webp 1012w, /megadeal-coming-soon/auckland-hero-v1.webp 1440w",
  alt: "Illustration of Auckland skyline across the harbour",
  position: "60% 55%",
};

// 400px copies: the tiles are shown at most ~180px wide.
export const V2_CATEGORIES = [
  { label: "Food & Drink", src: "/megadeal-coming-soon/food-drink-v1-400w.webp", alt: "Burger and fries at a cafe" },
  { label: "Beauty & Spa", src: "/megadeal-coming-soon/beauty-spa-v1-400w.webp", alt: "Facial treatment at a spa" },
  { label: "Things To Do", src: "/megadeal-coming-soon/things-to-do-v1-400w.webp", alt: "Kayaking on calm coastal water" },
  { label: "Travel & Getaways", src: "/megadeal-coming-soon/travel-getaways-v1-400w.webp", alt: "Hotel bedroom with a coastal view" },
  { label: "Health & Fitness", src: "/megadeal-coming-soon/health-fitness-v1-400w.webp", alt: "Adults attending a yoga class" },
  { label: "Home & Car", src: "/megadeal-coming-soon/home-car-v1-400w.webp", alt: "Cleaning a car wheel" },
] as const;

/** Reconciled with /help and /terms: no vouchers, a deal code, pay the
 *  business directly, booking depends on the deal, no launch date yet. */
export const V2_FAQS = [
  {
    question: "What is MegaDeal?",
    answer:
      "MegaDeal helps you discover local offers. Get a deal code, follow the offer’s instructions, and book or buy directly from the business. There are no MegaDeal vouchers to purchase.",
  },
  {
    question: "When and where will MegaDeal launch?",
    answer:
      "We’re preparing to launch first in Auckland, with more New Zealand cities to follow. Leave your email for launch updates. We haven’t announced a launch date yet.",
  },
  {
    question: "How do I use a deal?",
    answer:
      "Read what’s included and the conditions, get the deal code, then follow the business’s instructions. Some deals use a code on a booking website; others ask you to mention it when calling or visiting. You pay the business directly.",
  },
  {
    question: "Do I need to book?",
    answer:
      "It depends on the deal. Check whether booking is required, recommended or unnecessary. Offers are subject to availability. A deal code does not reserve a place or confirm a booking.",
  },
  {
    question: "What if a business won’t honour my deal?",
    answer:
      "Check the deal’s dates and conditions, then contact the business to resolve the issue. If you still need help, contact MegaDeal with the deal details. Payments are made directly to the business.",
  },
] as const;
