import { splitTermsForDisplay, STANDARD_TERMS } from "./dealTerms";
import { safeWebHref } from "./socialLinks";

/**
 * Whether a customer has to book to use a particular deal, and which
 * booking/contact actions the deal page offers as a result.
 *
 * Stored per deal on the Deals row as `bookingRequirement`. Deals written
 * before the field existed read as "unknown": nothing is inferred from a
 * missing booking link or an unticked box, because the absence of
 * "Bookings essential" is not evidence that no booking is needed. The one
 * inference allowed is the affirmative one — a legacy deal whose terms
 * say "Bookings essential" is treated as booking required.
 */
export type BookingRequirement = "required" | "recommended" | "not_required" | "unknown";

/** The choices a merchant makes on the deal form. "unknown" is only ever
 *  read from old data, never offered. */
export const BOOKING_CHOICES: {
  value: Exclude<BookingRequirement, "unknown">;
  label: string;
  hint: string;
}[] = [
  {
    value: "required",
    label: "Booking required",
    hint: "Customers must book before they visit",
  },
  {
    value: "recommended",
    label: "Booking recommended",
    hint: "Booking is advised but not a condition",
  },
  {
    value: "not_required",
    label: "No booking needed",
    hint: "Customers can just turn up and show their code",
  },
];

export function parseBookingRequirement(value: unknown): BookingRequirement {
  return value === "required" || value === "recommended" || value === "not_required" ? value : "unknown";
}

/** A choice the deal form and create route accept (i.e. not "unknown"). */
export function isBookingChoice(value: unknown): value is Exclude<BookingRequirement, "unknown"> {
  return parseBookingRequirement(value) !== "unknown";
}

const termLabel = (id: string) => STANDARD_TERMS.find((t) => t.id === id)!.label.toLowerCase();
const BOOKINGS_ESSENTIAL = termLabel("bookings");
const WALK_INS_WELCOME = termLabel("walk-ins");
const WHILE_STOCKS_LAST = termLabel("while-stocks");

function termsInclude(terms: string | null | undefined, label: string): boolean {
  if (!terms) return false;
  return splitTermsForDisplay(terms).some((piece) => piece.toLowerCase() === label);
}

/** True when the rendered terms contain the standard "Bookings essential"
 *  condition (exact label, as written by the deal form). */
export function termsSayBookingsEssential(terms: string | null | undefined): boolean {
  return termsInclude(terms, BOOKINGS_ESSENTIAL);
}

/** The business accepts walk-ins for this offer (the form's "Walk-ins
 *  welcome" box). Only ever said by the business: "recommended" alone is
 *  not evidence that walk-ins are accepted. */
export function termsSayWalkInsWelcome(terms: string | null | undefined): boolean {
  return termsInclude(terms, WALK_INS_WELCOME);
}

/** Limited stock: the offer runs while stocks last. */
export function termsSayWhileStocksLast(terms: string | null | undefined): boolean {
  return termsInclude(terms, WHILE_STOCKS_LAST);
}

/** The requirement the public page acts on: the stored choice if there is
 *  one, otherwise "required" only when the terms affirmatively say so. */
export function effectiveBookingRequirement(
  stored: BookingRequirement,
  terms: string | null | undefined,
): BookingRequirement {
  if (stored !== "unknown") return stored;
  return termsSayBookingsEssential(terms) ? "required" : "unknown";
}

/**
 * The form/create-route conflict check: "No booking needed" alongside the
 * ticked "Bookings essential" condition contradicts itself. Returns the
 * message to show, or null. A merchant's own free-text conditions can't
 * be checked this way and are left for them to keep consistent.
 */
export function bookingConflict(requirement: unknown, terms: string | null | undefined): string | null {
  if (requirement === "not_required" && termsSayBookingsEssential(terms)) {
    return "You've chosen “No booking needed” but also ticked “Bookings essential”. Change one of them so they agree.";
  }
  if (termsSayWalkInsWelcome(terms) && (requirement === "required" || termsSayBookingsEssential(terms))) {
    return "“Walk-ins welcome” can't go with a deal that needs a booking. Untick it, or change the booking choice.";
  }
  return null;
}

export interface BookingContactInput {
  bookingUrl: string | null;
  phone: string | null;
  bookingEmail: string | null;
}

export interface Phone {
  display: string;
  href: string;
}

/** A tappable phone link, or null when there aren't enough digits for a
 *  real number (a live call button needs a callable number). */
export function phoneLink(phone: string | null | undefined): Phone | null {
  const display = (phone ?? "").trim();
  if (!display) return null;
  const digits = display.replace(/[^0-9+]/g, "");
  if (digits.replace(/\D/g, "").length < 7) return null;
  return { display, href: `tel:${digits}` };
}

const EMAIL_RE = /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[^\s@<>()[\]\\,;:"]+$/;

/** A mailto link that opens a draft (never sends anything), or null when
 *  the address isn't a plausible email. */
export function emailLink(email: string | null | undefined, subject: string, body?: string): string | null {
  const address = (email ?? "").trim();
  if (!EMAIL_RE.test(address)) return null;
  const params = [`subject=${encodeURIComponent(subject)}`];
  if (body) params.push(`body=${encodeURIComponent(body)}`);
  return `mailto:${address}?${params.join("&")}`;
}

/** True when a booking-required deal has at least one usable route. */
export function hasUsableBookingRoute(contacts: BookingContactInput): boolean {
  return Boolean(
    safeWebHref(contacts.bookingUrl) || phoneLink(contacts.phone) || emailLink(contacts.bookingEmail, "x"),
  );
}

export type BookingActionKind = "book_online" | "call" | "email";

export interface BookingAction {
  kind: BookingActionKind;
  label: string;
  href: string;
  external: boolean;
}

export interface BookingPlan {
  requirement: BookingRequirement;
  /** "Before you book" for booking offers, "Before you go" otherwise. */
  conditionsHeading: string;
  /** Heading and sentence shown with the revealed code. */
  nextStepHeading: string;
  instruction: string;
  /** Deal-specific next actions, most direct first. */
  actions: BookingAction[];
  phone: Phone | null;
  /** The "a code isn't a reservation" note, when booking applies. */
  reservationNote: string | null;
  /** The middle step of the 1-2-3 list. */
  howToStep: string;
  /** "Bookings & contact" or "Contact & visit" in About the business. */
  contactHeading: string;
  /** Neutrally labelled general business contacts for About. */
  aboutActions: BookingAction[];
}

export function bookingPlan(
  requirement: BookingRequirement,
  contacts: BookingContactInput,
  businessName: string | null,
  dealName: string,
  /** False for a deal with no code: the wording then asks customers to
   *  mention MegaDeal instead of quoting a code that doesn't exist. */
  hasCode = true,
): BookingPlan {
  const business = businessName || "the business";
  const quote = hasCode ? "Quote this deal code" : "Mention this MegaDeal offer";
  const quoteStep = hasCode ? "quote the code" : "mention MegaDeal";
  const bookingHref = safeWebHref(contacts.bookingUrl);
  const phone = phoneLink(contacts.phone);
  const emailHref = emailLink(contacts.bookingEmail, `MegaDeal: ${dealName}`);
  const booking = requirement === "required" || requirement === "recommended";

  const bookOnline: BookingAction | null = bookingHref
    ? {
        kind: "book_online",
        label: "Book online",
        href: bookingHref,
        external: true,
      }
    : null;

  let actions: BookingAction[] = [];
  let nextStepHeading: string;
  let instruction: string;
  let howToStep: string;

  if (booking) {
    const call: BookingAction | null = phone
      ? {
          kind: "call",
          label: "Call to book",
          href: phone.href,
          external: false,
        }
      : null;
    const email: BookingAction | null = emailHref
      ? {
          kind: "email",
          label: "Email to book",
          href: emailHref,
          external: false,
        }
      : null;
    actions = [bookOnline, call, email].filter((a): a is BookingAction => a !== null);
    const primary = actions[0]?.kind;
    const verb =
      primary === "book_online"
        ? "book online"
        : primary === "call"
          ? "call to book"
          : primary === "email"
            ? "email to book"
            : "contact the business";
    nextStepHeading = requirement === "recommended" ? "Booking recommended" : `Your next step: ${verb}`;
    instruction =
      primary === "book_online"
        ? hasCode
          ? // Many businesses use their own promo code here, so say where it goes.
            `When you book online with ${business}, enter this code in the promo or discount code box. Mention it if you book by phone instead.`
          : `${quote} when you book with ${business}.`
        : primary === "call"
          ? `${quote} when you call ${business}.`
          : primary === "email"
            ? `${quote} when you email ${business}.`
            : `${quote} when you contact ${business}. Check the conditions for how to book.`;
    if (requirement === "recommended") {
      instruction = `Booking ahead is advised. ${instruction}`;
    }
    howToStep =
      primary === "book_online"
        ? hasCode
          ? "Book online and enter the code as your promo code"
          : `Book online and ${quoteStep}`
        : primary === "call"
          ? `Call ${business} and ${quoteStep}`
          : primary === "email"
            ? `Email ${business} and ${quoteStep}`
            : `Contact ${business} and ${quoteStep}`;
  } else if (requirement === "not_required") {
    // Deliberately no "Book online", even when the business has a booking
    // link: that link is for their other services, and offering it here
    // would contradict "no booking needed".
    nextStepHeading = "No booking needed";
    instruction = hasCode
      ? `Show your code when you visit ${business}.`
      : `Mention this MegaDeal offer when you visit ${business}.`;
    howToStep = `Visit ${business} and ${hasCode ? "show the code" : "mention MegaDeal"}`;
  } else {
    // Unknown (legacy): neutral contact routes, no promise either way.
    const call: BookingAction | null = phone
      ? {
          kind: "call",
          label: "Call the business",
          href: phone.href,
          external: false,
        }
      : null;
    const email: BookingAction | null = emailHref
      ? {
          kind: "email",
          label: "Email the business",
          href: emailHref,
          external: false,
        }
      : null;
    actions = [call, email].filter((a): a is BookingAction => a !== null);
    nextStepHeading = "Contact the business";
    instruction = `${quote} when you contact ${business}. Check the conditions for when and how to use it.`;
    howToStep = `Contact ${business} and ${quoteStep}`;
  }

  // About the business repeats the booking actions for booking offers;
  // otherwise it lists general contacts under neutral labels.
  const aboutActions: BookingAction[] = booking
    ? actions
    : (
        [
          bookOnline ? { ...bookOnline, label: "Online booking" } : null,
          phone
            ? {
                kind: "call" as const,
                label: "Call the business",
                href: phone.href,
                external: false,
              }
            : null,
          emailHref
            ? {
                kind: "email" as const,
                label: "Email the business",
                href: emailHref,
                external: false,
              }
            : null,
        ] as (BookingAction | null)[]
      ).filter((a): a is BookingAction => a !== null);

  return {
    requirement,
    conditionsHeading: booking ? "Before you book" : "Before you go",
    nextStepHeading,
    instruction,
    actions,
    phone,
    reservationNote: booking ? `A code doesn’t reserve a booking — ${business} confirms it directly.` : null,
    howToStep,
    contactHeading: booking ? "Bookings & contact" : "Contact & visit",
    aboutActions,
  };
}

/**
 * "Customers enter this code on my website": the business's own code,
 * confirmed tested, with the link where it's used. Checked by the form and
 * again by /api/deals/create. A MEGA- code never qualifies: MegaDeal
 * generates those and no business's website knows them.
 */
export function websiteCodeError(input: {
  code: string;
  onWebsite: boolean;
  url: string;
  tested: boolean;
}): string | null {
  if (!input.onWebsite) return null;
  if (!input.code || isMegaDealCode(input.code)) {
    return "Enter your own code first: customers can only use a code your website already accepts.";
  }
  if (!safeWebHref(input.url)) return "Add the web address where customers enter the code.";
  if (!input.tested) return "Tick to confirm you've tried this exact code on your website.";
  return null;
}

/** The deal's own "enter the code here" link, as the main action, when the
 *  business has set one up; null otherwise. */
export function websiteCodeAction(
  deal: { dealCode?: string | null; codeOnWebsite?: boolean | null; codeWebsiteUrl?: string | null },
  requirement: BookingRequirement,
): BookingAction | null {
  if (deal.codeOnWebsite !== true || !deal.dealCode || isMegaDealCode(deal.dealCode)) return null;
  const href = safeWebHref(deal.codeWebsiteUrl);
  if (!href) return null;
  const booking = requirement === "required" || requirement === "recommended";
  return { kind: "book_online", label: booking ? "Book online" : "Shop this offer", href, external: true };
}

/** MegaDeal-generated codes start with "MEGA-" (lib/dealCode.ts); a
 *  business can't choose one that does. Any other code is the business's
 *  own, which they were asked to set up in their own booking system. */
export function isMegaDealCode(code: string | null | undefined): boolean {
  return Boolean(code && code.startsWith("MEGA-"));
}

export interface GetDealCopy {
  /** "Booking required", "Booking recommended", "No booking needed"… */
  heading: string;
  /** One short, accurate sentence on how to use the code. */
  instruction: string;
  /** The one availability note, or null when none applies. */
  availability: string | null;
}

/**
 * The words in the deal page's "Get this deal" panel, from the booking
 * requirement and the main action (bookingPlan's first action). Nothing
 * here may imply that copying a code books, reserves or pays for anything.
 *
 * Online booking says to enter the code at checkout only when it's the
 * business's own code (they were asked to set it up in their booking
 * system). A MEGA- code isn't known to work there, so it's shown on
 * arrival instead.
 */
export function getThisDealCopy(
  requirement: BookingRequirement,
  primary: BookingActionKind | null,
  code: string | null,
  /** From the deal's terms: walk-ins accepted, and limited stock.
   *  websiteCode: the business confirmed the code works on its website
   *  (undefined for older deals, which keep the old rule: their own code
   *  was described to them as one customers enter online). */
  extras: { walkIns?: boolean; limitedStock?: boolean; websiteCode?: boolean } = {},
): GetDealCopy {
  const quote = code ? "quote your code" : "mention this MegaDeal offer";
  const Quote = code ? "Quote your code" : "Mention this MegaDeal offer";
  const availability = `${extras.limitedStock ? "While stocks last. " : ""}Subject to availability. Your code does not confirm a booking.`;

  const enterOnline = Boolean(code) && (extras.websiteCode ?? (code !== null && !isMegaDealCode(code)));

  if (requirement === "not_required") {
    if (primary === "book_online" && enterOnline) {
      return {
        heading: "No booking needed",
        instruction: "Enter this code at checkout on the business's website, and check the discount applies before paying.",
        availability: extras.limitedStock ? "While stocks last. Copying a code does not reserve an item." : null,
      };
    }
    return {
      heading: "No booking needed",
      instruction: code
        ? "Show this code before ordering or paying."
        : "Mention this MegaDeal offer before ordering or paying.",
      availability: extras.limitedStock
        ? `While stocks last. ${code ? "Copying a code" : "This offer"} does not reserve an item.`
        : null,
    };
  }

  if (requirement === "unknown") {
    return {
      heading: "Contact the business",
      instruction: `${Quote} when you contact the business. Check the conditions for when and how to use it.`,
      availability,
    };
  }

  const heading = requirement === "required" ? "Booking required" : "Booking recommended";
  let instruction: string;
  if (primary === "book_online" && enterOnline) {
    instruction = "Book online and enter this code at checkout. Check the discount applies before paying.";
  } else if (primary === "book_online") {
    instruction = `Book online, then ${code ? "show this code" : "mention this MegaDeal offer"} when you visit. Confirm the offer with the business.`;
  } else if (primary === "email") {
    instruction = `${code ? "Include this code in" : "Mention this MegaDeal offer in"} your booking enquiry. Wait for the business to confirm.`;
  } else if (requirement === "required") {
    instruction = `Book with the business and ${quote}.`;
  } else {
    instruction = `We recommend booking ahead. ${Quote} when contacting the business.`;
  }
  // Only when the business has said so, and never on a booking-required
  // offer (bookingConflict stops that combination being saved).
  if (requirement === "recommended" && extras.walkIns) {
    instruction += ` Walk-ins are welcome too: ${code ? "show your code" : "mention this MegaDeal offer"} when you arrive.`;
  }
  return { heading, instruction, availability };
}
