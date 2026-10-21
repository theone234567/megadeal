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

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      // General crawlers, including AI answer-engine crawlers that respect
      // robots.txt (GPTBot/ChatGPT-User for OpenAI, ClaudeBot/anthropic-ai
      // for Claude, PerplexityBot, Google-Extended for Gemini/AI Overviews)
      // — allowed by default here since organic AI-search visibility is
      // wanted, not blocked. Only the merchant/admin back-office and API
      // routes are off-limits: no public content lives there, and nothing
      // there should be indexable regardless of crawler.
      { userAgent: "*", allow: "/", disallow: DISALLOWED },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    // No "Host:" line: it was Yandex's, and Google and Bing ignore it. The
    // preferred address is set by the canonical links and the www → apex
    // redirect.
  };
}
