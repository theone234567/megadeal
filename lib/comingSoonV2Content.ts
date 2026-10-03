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
 * Category photos: the Unsplash photos the current coming-soon page
 * already uses (Unsplash licence: free for commercial use, no attribution
 * required), loaded through next/image as today.
 *
 * TODO(owner): the pack asks for a hotel BEDROOM for Travel & Getaways
 * and kayaking for Things To Do. These two are the existing page's photos
 * and should be swapped for approved ones; only the URL below changes.
 */
export const V2_CATEGORIES = [
  {
    label: "Food & Drink",
    src: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=720&q=72",
    alt: "Burger and fries at a restaurant",
  },
  {
    label: "Beauty & Spa",
    src: "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=720&q=72",
    alt: "Spa treatment",
  },
  {
    label: "Things To Do",
    src: "https://images.unsplash.com/photo-1502680390469-be75c86b636f?auto=format&fit=crop&w=720&q=72",
    alt: "Outdoor activity on the water",
  },
  {
    label: "Travel & Getaways",
    src: "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=720&q=72",
    alt: "Hotel stay",
  },
  {
    label: "Health & Fitness",
    src: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=720&q=72",
    alt: "Fitness class",
  },
  {
    label: "Home & Car",
    src: "https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?auto=format&fit=crop&w=720&q=72",
    alt: "Car care",
  },
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
