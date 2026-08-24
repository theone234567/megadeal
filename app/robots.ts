import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/siteConfig";

const DISALLOWED = ["/admin", "/admin/*", "/portal", "/portal/*", "/api/*", "/redeem"];

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
