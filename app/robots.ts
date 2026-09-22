import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/siteConfig";

// /redeem is a real, linked-to help article (see Footer, /how-it-works,
// /help), not a functional/private route — it belongs indexed like any
// other content page, so it isn't in this list.
//
// /login-callback and /reset-password are both client components (no
// static content, state-dependent on a one-time code/token in the URL),
// so neither can export its own `metadata` the way every other page here
// does — Next.js only allows that from a Server Component. Blocking them
// here instead gets the same "don't index this" outcome without needing
// a Server Component wrapper just to hold a robots directive.
const DISALLOWED = ["/admin", "/admin/*", "/portal", "/portal/*", "/api/*", "/login-callback", "/reset-password"];

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
    host: SITE_URL,
  };
}
