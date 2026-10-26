import Trackers from "@/components/Trackers";
import type { Metadata } from "next";
import { Suspense } from "react";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import StaleBuildRecovery from "@/components/StaleBuildRecovery";
import PreviewBanner from "@/components/PreviewBanner";
import PrelaunchBar from "@/components/PrelaunchBar";
import { SOCIAL_URLS } from "@/components/SocialLinks";
import { DEALS_OPEN, FOUNDER_NAME, LEGAL_ENTITY_NAME, LEGAL_ENTITY_NZBN, ORGANIZATION_ID, PRELAUNCH_HOME, SITE_DESCRIPTION, SITE_LAUNCHED, SITE_NAME, SITE_TAGLINE, SITE_URL } from "@/lib/siteConfig";
import { safeJsonLd } from "@/lib/safeJsonLd";
import { INDEXABLE } from "@/lib/robotsMeta";
import { SEARCH_LOGO, SQUARE_LOGO } from "@/lib/brand";
import { caveat, fredoka, plusJakartaSans } from "@/lib/fonts";
import { getMegadealArt } from "@/lib/megadealAssets";
import { MegadealArtProvider } from "@/context/MegadealArtProvider";

/** Other ways people write the name (JSON-LD alternateName). */
const SITE_ALTERNATE_NAMES = [`${SITE_NAME} NZ`, "Mega Deal", "Mega Deal NZ"];

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — ${SITE_TAGLINE}`,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  // Stamps every page with the commit it was built from, so which build a
  // given page came from is visible in its own source. /api/version
  // reports the same thing without devtools, which is the practical route
  // on a phone; this one survives being saved or screenshotted.
  other: {
    "x-build-sha": process.env.NEXT_PUBLIC_BUILD_SHA ?? "unknown",
    "x-build-time": process.env.NEXT_PUBLIC_BUILD_TIME ?? "unknown",
  },
  // No site-wide canonical: every indexable page names its own (the
  // homepage in app/page.tsx). A default of "/" here was inherited by
  // every page that didn't, so 404s, ended deals and the noindexed
  // utility pages (portal, unsubscribe…) all told search engines they
  // were copies of the homepage.
  // Large image previews and full snippets (lib/robotsMeta.ts). Pages
  // that set their own robots replace this whole.
  robots: INDEXABLE,
  // Google/Bing verification codes, once you have them (see below), go in
  // Cloudflare's runtime variables — no redeploy needed to pick them up.
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || undefined,
    // Bing Webmaster Tools. Not a secret — it's public in every page's
    // <head> — so it lives here rather than depending on a variable.
    other: {
      "msvalidate.01": process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION || "24822C5FE35F005B111F65DB050D50F4",
    },
  },
  openGraph: {
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    siteName: SITE_NAME,
    type: "website",
    locale: "en_NZ",
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
  },
};

export const viewport = {
  themeColor: "#6D28D9",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Resolved once per request, here rather than at each call site — the
  // header logo and the MegadealArtProvider (which reaches the portal's
  // mascot, several client components deeper) both need the same result.
  const megadealArt = getMegadealArt();

  return (
    // data-scroll-behavior="smooth": globals.css scrolls smoothly for
    // in-page links (e.g. "Browse deals"). Since Next 16 that also
    // animated every page change unless this attribute is set: clicking a
    // deal card glided down the page for half a second and, on desktop,
    // stopped with the top of the deal under the sticky header. With it,
    // Next jumps straight to the top of the new page.
    <html
      lang="en-NZ"
      data-scroll-behavior="smooth"
      className={`${plusJakartaSans.variable} ${fredoka.variable} ${caveat.variable}`}
    >
      <body className="min-h-screen bg-white font-sans text-slate-900 antialiased">
        {/* First thing in the tree: a tab stranded by a deploy should
            repair itself before the visitor hits a dead form. */}
        <StaleBuildRecovery />
        {/* Points feed readers and AI tools at the machine-readable copy of
            the deals (app/feed/deals.json, documented at /developers).
            React places it in <head>. Only once there are deals to list. */}
        {DEALS_OPEN && (
          <link rel="alternate" type="application/json" title={`${SITE_NAME} live deals (JSON)`} href={`${SITE_URL}/feed/deals.json`} />
        )}
        <Suspense fallback={null}>
          <Trackers />
        </Suspense>
        <MegadealArtProvider art={megadealArt}>
          {/* No SessionProvider here: only the portal, admin and signup
              pages need to know who's signed in, and they have it in their
              own layouts. Here it would put a session check (/api/auth/me)
              on every page, public or not. */}
          {/* First tab stop on every page: past the banner and header
              (about 8 stops) straight to the page itself (T253). */}
          <a
            href="#content"
            className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-full focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-bold focus:text-hp-purple focus:shadow-card focus:outline-none focus:ring-2 focus:ring-hp-purple"
          >
            Skip to main content
          </a>
          <PreviewBanner siteLaunched={DEALS_OPEN} prelaunchHome={PRELAUNCH_HOME} />
          {PRELAUNCH_HOME && <PrelaunchBar />}
          <Header prelaunch={PRELAUNCH_HOME} />
          <div id="content" tabIndex={-1} className="outline-none">
            {children}
          </div>
          <Footer siteLaunched={SITE_LAUNCHED} prelaunchHome={PRELAUNCH_HOME} dealsOpen={DEALS_OPEN} />
        </MegadealArtProvider>
        {/* The site's structured data, after the page itself: search
            engines read it from anywhere, and ahead of the header it put
            several KB before every page's content for crawlers that read
            the first part of a page (SEO pack T230). */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: safeJsonLd({
              "@context": "https://schema.org",
              "@type": "Organization",
              "@id": ORGANIZATION_ID,
              name: SITE_NAME,
              // "MegaDeal" alone is shared with other brands' "megadeals"
              // offers; the NZ name (its social handles) and the company's
              // NZBN tell search engines and AI tools which one this is.
              // "Mega Deal", spaced, is how many people type it.
              alternateName: SITE_ALTERNATE_NAMES,
              // The registered company behind the brand (lib/siteConfig.ts).
              legalName: LEGAL_ENTITY_NAME,
              ...(LEGAL_ENTITY_NZBN
                ? { identifier: { "@type": "PropertyValue", propertyID: "NZBN", value: LEGAL_ENTITY_NZBN } }
                : {}),
              // As he signs the note on /list-your-business.
              founder: { "@type": "Person", name: FOUNDER_NAME },
              url: SITE_URL,
              description: SITE_DESCRIPTION,
              areaServed: { "@type": "Country", name: "New Zealand" },
              // The square elephant icon (SQUARE_LOGO, lib/brand.ts) as the
              // logo: what Bing and Google show beside the brand, where a
              // square reads best. The wordmark the headers show
              // (SEARCH_LOGO) as its image. Both give Google, Bing and AI
              // answer engines an actual brand image to attach to this
              // entity, alongside the sameAs profiles below.
              logo: {
                "@type": "ImageObject",
                url: `${SITE_URL}${SQUARE_LOGO.path}`,
                width: SQUARE_LOGO.width,
                height: SQUARE_LOGO.height,
              },
              image: {
                "@type": "ImageObject",
                url: `${SITE_URL}${SEARCH_LOGO.path}`,
                width: SEARCH_LOGO.width,
                height: SEARCH_LOGO.height,
              },
              // Ties the brand's social profiles to this entity for Google —
              // one of the standard signals behind a Knowledge Panel.
              sameAs: SOCIAL_URLS,
            }),
          }}
        />
        {/* WebSite, plus a SearchAction once there is something to find.
            SearchAction is the hook for Google's sitelinks search box and a
            defined "how do I search this site" entry point for AI answer
            engines; it matches the ?q= search the homepage understands (see
            app/HomeDeals.tsx). Before launch "/" redirects to /coming-soon
            and there are no live deals, so advertising a search endpoint
            that can only return nothing is a promise the site can't keep —
            it is added only once SITE_LAUNCHED is true. */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: safeJsonLd({
              "@context": "https://schema.org",
              "@type": "WebSite",
              // Deal pages point back to this (lib/dealJsonLd.ts isPartOf).
              "@id": `${SITE_URL}/#website`,
              name: SITE_NAME,
              // Google reads the site name it shows in results from here;
              // "MegaDeal NZ" is the fallback it can use if "MegaDeal" alone
              // is ambiguous; "Mega Deal" ties the spaced search to this site.
              alternateName: SITE_ALTERNATE_NAMES,
              url: SITE_URL,
              inLanguage: "en-NZ",
              publisher: { "@id": ORGANIZATION_ID },
              ...(DEALS_OPEN
                ? {
                    potentialAction: {
                      "@type": "SearchAction",
                      target: `${SITE_URL}/?q={search_term_string}`,
                      "query-input": "required name=search_term_string",
                    },
                  }
                : {}),
            }),
          }}
        />
      </body>
    </html>
  );
}
