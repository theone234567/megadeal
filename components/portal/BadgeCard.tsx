"use client";

import { useState } from "react";
import { SITE_URL } from "@/lib/siteConfig";
import { businessSlug } from "@/lib/slug";

const BADGE_PATH = "/badge/find-us-on-megadeal.png";
const BADGE_WIDTH = 147;
const BADGE_HEIGHT = 72;

/**
 * "Find us on MegaDeal" badge for a business to put on its own website,
 * linking to its public MegaDeal profile. Each one is a link from a real
 * local business's site to MegaDeal — the kind of signal search engines
 * and AI answer engines weigh most — and a route for that business's own
 * visitors to find its deals.
 *
 * Offered, never required or rewarded: a badge link given in exchange for
 * something is the pattern Google treats as a link scheme. Plain brand
 * anchor text, same as review-site badges.
 *
 * Shown only to approved businesses, so an unreviewed listing is never
 * promoted from someone's site. The utm tags let the site's existing
 * attribution (lib/attribution.ts) report badge visits; the profile's
 * canonical URL keeps them out of search results.
 */
export default function BadgeCard({ merchantId, businessName }: { merchantId: string; businessName: string }) {
  const [copied, setCopied] = useState<"code" | "link" | null>(null);

  const profileUrl = `${SITE_URL}/business/${businessSlug(businessName, merchantId)}`;
  const linkUrl = `${profileUrl}?utm_source=business-badge&utm_medium=referral`;
  const badgeUrl = `${SITE_URL}${BADGE_PATH}`;
  const snippet = `<a href="${linkUrl}" target="_blank" rel="noopener"><img src="${badgeUrl}" alt="Find us on MegaDeal" width="${BADGE_WIDTH}" height="${BADGE_HEIGHT}"></a>`;

  async function copy(text: string, which: "code" | "link") {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(which);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      // Clipboard access can be denied — the fields stay selectable by hand.
    }
  }

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-card">
      <h2 className="text-lg font-bold text-slate-900">Add the MegaDeal badge to your website</h2>
      <p className="mt-1 text-sm text-slate-600">
        Let visitors to your own website know they can find your deals on MegaDeal. It links
        straight to your MegaDeal page, and links like this help search engines find it too.
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-4 rounded-xl bg-slate-50 p-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={BADGE_PATH} alt="Find us on MegaDeal" width={BADGE_WIDTH} height={BADGE_HEIGHT} />
        <a
          href={BADGE_PATH}
          download="find-us-on-megadeal.png"
          className="text-sm font-semibold text-brand-700 underline underline-offset-2 hover:text-brand-800"
        >
          Download the image
        </a>
      </div>

      <label htmlFor="badge-code" className="mt-4 block text-sm font-semibold text-slate-800">
        Code for your website
      </label>
      <p className="mt-0.5 text-xs text-slate-500">
        Wix, Squarespace, WordPress and Shopify all have an &ldquo;Embed code&rdquo; or
        &ldquo;Custom HTML&rdquo; block — paste this into one, for example in your footer.
      </p>
      <textarea
        id="badge-code"
        readOnly
        rows={3}
        value={snippet}
        onClick={(e) => e.currentTarget.select()}
        className="mt-2 w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 font-mono text-xs text-slate-700 outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
      />
      <div className="mt-2 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => copy(snippet, "code")}
          className="rounded-full bg-brand-600 px-5 py-2 text-sm font-bold text-white transition hover:bg-brand-700 active:scale-95"
        >
          {copied === "code" ? "Copied ✓" : "Copy code"}
        </button>
        <button
          type="button"
          onClick={() => copy(profileUrl, "link")}
          className="rounded-full border border-slate-200 px-5 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50 active:scale-95"
        >
          {copied === "link" ? "Copied ✓" : "Copy page link only"}
        </button>
      </div>
    </div>
  );
}
