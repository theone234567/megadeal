import { SITE_NAME } from "@/lib/siteConfig";
import { COMPANY, INTRO, categoryLinks } from "@/lib/llmsContent";
import { HELP_FAQ_TEXT } from "@/lib/helpFaq";

// The longer companion to /llms.txt: the same introduction and company
// facts, plus every Help Centre answer in full, so an AI tool answering a
// question about MegaDeal (paying, redeeming, refunds, listing a business)
// can quote the site's own answer rather than guess. Built from the same
// text the pages show (lib/helpFaq.ts, lib/llmsContent.ts), never typed
// out twice. Current status and live deals stay in /llms.txt.
export const revalidate = 3600;

const QUESTIONS = HELP_FAQ_TEXT.map(({ q, a }) => `### ${q}\n\n${a}`).join("\n\n");

export async function GET() {
  const body = [
    `# ${SITE_NAME}: full reference`,
    "",
    INTRO,
    "",
    "Current status, live deals and data feeds: /llms.txt",
    "",
    COMPANY,
    "",
    "## Categories",
    "",
    categoryLinks,
    "",
    "## Questions and answers",
    "",
    "From the Help Centre (/help).",
    "",
    QUESTIONS,
    "",
  ].join("\n");

  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
