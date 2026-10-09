/**
 * Admin > Launch checklist: docs/LAUNCH-DAY.md as a page. Items the site
 * can check for itself are worked out from what it knows (facts below);
 * the rest are ticked by hand, kept on the server so a tick holds on
 * every device. Building the list changes nothing.
 */

export type ItemState = "done" | "todo" | "warning" | "info";

export interface ChecklistItem {
  id: string;
  title: string;
  state: ItemState;
  /** What's true now, or what to do. */
  detail: string;
  /** Ticked by hand (a checkbox), not checked by the site. */
  manual: boolean;
  tickedAt?: string | null;
  link?: { href: string; label: string };
}

export interface ChecklistSection {
  id: "before" | "launch" | "after";
  title: string;
  items: ChecklistItem[];
}

export interface LaunchFacts {
  launched: boolean;
  /** Moving off Wix: every switch on, and the first thing missing if any. */
  offWix: { allOn: boolean; problem: string | null } | null;
  /** Moving off Wix's own "Nightly backup" check. */
  backup: { ok: boolean; detail: string };
  accountEmails: { problem: string | null; lastSentAt: string | null };
  turnstile: boolean;
  twoFactor: boolean;
  aiReview: boolean;
  notifyEmail: boolean;
  /** Businesses (not suspended) with no login on the new sign-in yet. */
  withoutLogin: number;
  /** Businesses that look like tests, by name or email. */
  testBusinesses: { id: string; name: string; email: string }[];
  approvedBusinesses: number;
  draftDeals: number;
  liveDeals: number;
  verifiedSubscribers: number;
  ticks: Record<string, string>;
}

/** Ticked by hand: everything here, and only these, can be ticked. */
export const MANUAL_ITEMS = [
  "terms",
  "first-deals",
  "dmarc",
  "uptime",
  "workers-paid",
  "resend-plan",
  "search-console",
  "bing-webmaster",
  "signed-out-look",
  "submit-bing",
  "google-resubmit",
  "share-preview",
  "launch-email",
  "offer-check",
] as const;
export type ManualItem = (typeof MANUAL_ITEMS)[number];
export const isManualItem = (id: unknown): id is ManualItem => typeof id === "string" && (MANUAL_ITEMS as readonly string[]).includes(id);

/** A business that looks like a test, by its name or email. */
export function looksLikeTest(name: string, email: string): boolean {
  return /\btest(s|ing)?\b|test\d|\+test|demo\b/i.test(name) || /\+test|test\d*@|@(example\.(com|nz|co\.nz)|[^@]*\.test)$/i.test(email);
}

const RESEND_FREE_DAILY = 100;

const nz = (iso: string) =>
  new Date(iso).toLocaleString("en-NZ", { timeZone: "Pacific/Auckland", dateStyle: "medium", timeStyle: "short" });

export function buildChecklist(f: LaunchFacts): ChecklistSection[] {
  const manual = (id: ManualItem, title: string, detail: string, link?: ChecklistItem["link"]): ChecklistItem => ({
    id,
    title,
    detail,
    manual: true,
    state: f.ticks[id] ? "done" : "todo",
    tickedAt: f.ticks[id] ?? null,
    ...(link ? { link } : {}),
  });
  const auto = (id: string, title: string, state: ItemState, detail: string, link?: ChecklistItem["link"]): ChecklistItem => ({
    id,
    title,
    state,
    detail,
    manual: false,
    ...(link ? { link } : {}),
  });
  const n = (count: number, one: string, many = `${one}s`) => `${count} ${count === 1 ? one : many}`;

  const before: ChecklistItem[] = [
    auto(
      "off-wix",
      "Moving off Wix finished",
      !f.offWix ? "warning" : f.offWix.allOn && !f.offWix.problem ? "done" : "todo",
      !f.offWix
        ? "The checks couldn't run just now. Open Moving off Wix to see why."
        : f.offWix.problem
          ? `Next on Moving off Wix: ${f.offWix.problem}`
          : f.offWix.allOn
            ? "Database, photos, email and business logins all run on MegaDeal's own services."
            : "Not every part is switched over yet.",
      { href: "/admin/move-off-wix", label: "Moving off Wix" }
    ),
    auto(
      "backup",
      "Nightly backup running",
      f.backup.ok ? "done" : "todo",
      f.backup.detail,
      { href: "/admin/move-off-wix", label: "Moving off Wix" }
    ),
    auto(
      "account-emails",
      "Sign-up codes and password emails go out",
      f.accountEmails.problem ? "warning" : f.accountEmails.lastSentAt ? "done" : "todo",
      f.accountEmails.problem
        ? f.accountEmails.problem
        : f.accountEmails.lastSentAt
          ? `Last one went out ${nz(f.accountEmails.lastSentAt)}.`
          : "None sent on the new sign-in yet: sign up as a test business in a private window (then delete it, below) to prove it works live.",
      { href: "/list-your-business", label: "Sign-up page" }
    ),
    auto(
      "existing-businesses",
      "Existing businesses can sign in",
      f.withoutLogin === 0 ? "done" : "todo",
      f.withoutLogin === 0
        ? "Every business has a login on the new sign-in."
        : `${n(f.withoutLogin, "business has", "businesses have")} no password on the new sign-in yet. Moving off Wix > Business logins > Email them a set-password link.`,
      { href: "/admin/move-off-wix", label: "Moving off Wix" }
    ),
    auto(
      "test-businesses",
      "Test businesses deleted",
      f.testBusinesses.length === 0 ? "done" : "todo",
      f.testBusinesses.length === 0
        ? "None left that look like tests."
        : `These look like tests: ${f.testBusinesses
            .slice(0, 8)
            .map((b) => b.name || b.email)
            .join(", ")}${f.testBusinesses.length > 8 ? ` and ${f.testBusinesses.length - 8} more` : ""}. Open each in Businesses and use Delete at the bottom.`,
      f.testBusinesses[0] ? { href: `/admin/businesses/${f.testBusinesses[0].id}`, label: "Open the first" } : undefined
    ),
    auto(
      "robot-check",
      "Robot check on sign-up and forms",
      f.turnstile ? "done" : "todo",
      f.turnstile ? "Cloudflare Turnstile keys are set." : "Turnstile keys aren't both set (Moving off Wix > Business logins).",
    ),
    auto(
      "two-factor",
      "Admin sign-in has a second step",
      f.twoFactor ? "done" : "warning",
      f.twoFactor
        ? "Admin sign-in asks for an authenticator code."
        : "Admin sign-in is password only. Recommended before launch: Admin > Two-factor sign-in.",
      { href: "/admin/two-factor", label: "Two-factor sign-in" }
    ),
    auto(
      "notify-email",
      "Admin alerts have somewhere to go",
      f.notifyEmail ? "done" : "todo",
      f.notifyEmail
        ? "ADMIN_NOTIFY_EMAIL is set: new businesses, messages and problems are emailed to you."
        : "ADMIN_NOTIFY_EMAIL isn't set, so the site can't email you about anything.",
    ),
    auto(
      "ai-review",
      "AI deal check",
      f.aiReview ? "done" : "info",
      f.aiReview
        ? "On: clean deals from approved businesses can go live without waiting."
        : "Off (no ANTHROPIC_API_KEY): every deal waits for you to approve it. Fine, if someone is free to approve on launch morning.",
    ),
    manual(
      "first-deals",
      "First deals lined up",
      `${n(f.approvedBusinesses, "approved business", "approved businesses")}, ${n(f.draftDeals, "saved draft")}. Drafts can be submitted once the site launches and go live when approved: agree a time with the businesses and keep launch morning free to approve.`,
      { href: "/admin", label: "Businesses" }
    ),
    manual(
      "terms",
      "Offer wording in the terms updated",
      "The one launch wording that doesn't switch by itself (a legal page). Ask Claude to apply the wording in docs/LAUNCH-OFFER-CHECKLIST.md, then read it.",
      { href: "/terms", label: "Terms" }
    ),
    manual(
      "dmarc",
      "Email domain checks pass (DMARC)",
      "Cloudflare > megadeal.co.nz > Security > Overview: no “DMARC Record Error”. Fixes sign-up codes and launch emails landing in spam.",
    ),
    manual(
      "uptime",
      "Uptime monitor watching the site",
      "UptimeRobot or Better Stack (free): check https://megadeal.co.nz/api/health every 5 minutes and email you if it fails.",
    ),
    manual(
      "workers-paid",
      "Cloudflare plan sized for launch",
      "Cloudflare > Workers & Pages > Plans: Workers Paid ($5 a month) lifts the free 100,000-requests-a-day limit, past which the site shows an error. Worth it before any advertising.",
    ),
    manual(
      "resend-plan",
      "Email plan covers the launch email",
      `${n(f.verifiedSubscribers, "confirmed subscriber")} to email at launch, plus businesses. Resend's free plan sends ${RESEND_FREE_DAILY} a day${
        f.verifiedSubscribers + f.approvedBusinesses > RESEND_FREE_DAILY / 2 ? ": move to a paid plan for the month first" : ""
      }.`,
    ),
    manual(
      "search-console",
      "Google Search Console set up",
      "search.google.com/search-console: add megadeal.co.nz (Domain, verified through Cloudflare DNS) and submit https://megadeal.co.nz/sitemap.xml.",
    ),
    manual(
      "bing-webmaster",
      "Bing Webmaster Tools set up",
      "bing.com/webmasters: import from Google Search Console (one click) once that's done.",
    ),
  ];

  const launch: ChecklistItem[] = [
    auto(
      "launched",
      "Open the site to everyone",
      f.launched ? "done" : "todo",
      f.launched
        ? "The site is launched: the homepage, deals and business pages are public."
        : "Tell Claude “launch the site”. It sets the launch switch and today's date (lib/siteConfig.ts) and publishes; within a few minutes the coming-soon page becomes the deals homepage. Going back is the same switch.",
    ),
  ];

  const after: ChecklistItem[] = [
    manual("signed-out-look", "Look at it signed out", "In a private window: the homepage, a category, a deal page, a business page, and /list-your-business (up to 3 months, WELCOME3).", { href: "/", label: "Homepage" }),
    manual("submit-bing", "Pages sent to Bing and others", "Admin > Submit all pages to Bing (IndexNow; Yandex and others too).", { href: "/admin", label: "Admin" }),
    manual(
      "google-resubmit",
      "Google can see it",
      "Search Console: resubmit the sitemap, then URL Inspection > https://megadeal.co.nz/ > Test live URL. It should show the deals homepage, not “Just a moment...”.",
    ),
    manual("share-preview", "Link previews look right", "Send yourself the homepage and /list-your-business on Messenger or WhatsApp: new logo, and up to 3 months on the business page."),
    manual(
      "launch-email",
      "Launch email sent",
      `Admin > Subscribers > Email subscribers (email name “launch”): preview, send yourself a test, then send. ${n(f.verifiedSubscribers, "confirmed subscriber")} waiting.`,
      { href: "/admin", label: "Subscribers" }
    ),
    manual("offer-check", "Launch offer works end to end", "Approve a test signup that used WELCOME3: 12 credits, and its email names WELCOME3 (docs/LAUNCH-OFFER-CHECKLIST.md).", undefined),
  ];
  if (f.launched) after.unshift(auto("live-deals", "Deals live now", f.liveDeals > 0 ? "done" : "warning", f.liveDeals > 0 ? `${n(f.liveDeals, "deal")} on the site.` : "No deals live: the homepage is empty."));

  return [
    { id: "before", title: "Before launch", items: before },
    { id: "launch", title: "Launch", items: launch },
    { id: "after", title: "Straight after", items: after },
  ];
}
