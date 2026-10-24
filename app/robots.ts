import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/siteConfig";

// /redeem is a real, linked-to help article (see Footer, /how-it-works,
// /help), not a functional/private route — it belongs indexed like any
// other content page, so it isn't in this list.
//
// /reset-password is state-dependent on a one-time token, so it's kept out
// here as well as by its noindex header. (/login-callback, Wix's sign-in
// return page, is gone: left crawlable so search engines see it's gone
// and drop it.)
//
// /portal isn't here: it's linked from every page ("Business sign in"), and
// a blocked URL can still be listed ("indexed, though blocked by
// robots.txt") because crawlers can't read the page's own noindex. Left
// crawlable, they see app/portal/layout.tsx's noindex and drop it. It's a
// sign-in screen to anyone not signed in, with nothing private on it.
const DISALLOWED = ["/admin", "/admin/*", "/api/*", "/reset-password"];

/** Search and answer engines, and the agents that fetch a page when a
 *  person asks them to: named so the intent is explicit (SEO pack T02),
 *  with the same rules as everyone else. A crawler follows only its own
 *  group, so each repeats the disallows. */
const SEARCH_AND_ANSWER_BOTS = [
  "Googlebot",
  "Bingbot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "PerplexityBot",
  "Perplexity-User",
  "Claude-SearchBot",
  "Claude-User",
  "Applebot",
  "DuckDuckBot",
];

/** Crawlers that collect pages to train AI models. Allowed, so the
 *  assistants people ask know MegaDeal (the owner's call: MANUAL-STEPS
 *  M05). To opt out, change this group's allow to disallow "/". */
const AI_TRAINING_BOTS = ["GPTBot", "Google-Extended", "ClaudeBot", "Applebot-Extended", "CCBot"];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      // Everyone else. Only the admin back office, the API and the reset
      // page are off-limits: no public content lives there.
      { userAgent: "*", allow: "/", disallow: DISALLOWED },
      { userAgent: SEARCH_AND_ANSWER_BOTS, allow: "/", disallow: DISALLOWED },
      { userAgent: AI_TRAINING_BOTS, allow: "/", disallow: DISALLOWED },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    // No "Host:" line: it was Yandex's, and Google and Bing ignore it. The
    // preferred address is set by the canonical links and the www → apex
    // redirect.
  };
}
