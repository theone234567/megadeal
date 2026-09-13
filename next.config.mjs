// Which commit this bundle was built from, captured at BUILD time.
//
// Added after several rounds of "is the fix actually live?" that could
// not be answered from outside: a stale page and a broken deploy look
// identical, and guessing wrong sends everyone chasing the wrong bug. The
// names below are what each builder exports — Cloudflare Workers Builds,
// Cloudflare Pages, and GitHub Actions respectively.
//
// It has to go through `env` rather than being read at request time: on
// Workers the CI variables exist only while building, so a runtime lookup
// would always come back empty.
const BUILD_SHA = (
  process.env.WORKERS_CI_COMMIT_SHA ||
  process.env.CF_PAGES_COMMIT_SHA ||
  process.env.GITHUB_SHA ||
  "unknown"
).slice(0, 7);

/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_BUILD_SHA: BUILD_SHA,
    NEXT_PUBLIC_BUILD_TIME: new Date().toISOString(),
  },
  images: {
    // Cloudflare/OpenNext was returning blank remote images through the
    // Next image optimiser on the coming-soon page. Serve remote images
    // directly so the Auckland hero and category photography render
    // reliably in production.
    unoptimized: true,
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "upload.wikimedia.org" },
      { protocol: "https", hostname: "static.wixstatic.com" },
      { protocol: "https", hostname: "**.wixstatic.com" },
      { protocol: "https", hostname: "cdn.pixabay.com" },
    ],
  },
  async redirects() {
    // The public merchant-signup section has moved twice now: /merchants ->
    // /businesses -> /list-your-business. Keep both historical paths working.
    return [
      { source: "/merchants", destination: "/list-your-business", permanent: true },
      { source: "/merchants/:path*", destination: "/list-your-business/:path*", permanent: true },
      { source: "/businesses", destination: "/list-your-business", permanent: true },
      { source: "/businesses/:path*", destination: "/list-your-business/:path*", permanent: true },
    ];
  },
  async headers() {
    // Content-Security-Policy.
    //
    // This matters more here than on a typical marketing site: the Wix
    // member session cookie has to stay readable from JavaScript, because
    // the client SDK reads it directly to authenticate every browser-side
    // Wix call the portal makes. That rules out httpOnly, so an injected
    // script would be able to lift a live merchant session. A CSP is the
    // main thing standing in the way of that.
    //
    // Every origin below is one the app genuinely talks to from the
    // browser. Server-only callers (places.googleapis.com in
    // /api/places/*, api.indexnow.org in lib/indexNow.ts) are deliberately
    // absent — requests made by the Worker are not subject to page CSP,
    // and listing them would only widen what a hijacked page may reach.
    const csp = [
      "default-src 'self'",
      // 'unsafe-inline' is required: Next's App Router inlines the RSC
      // payload and bootstrap scripts. Removing it means nonces, which in
      // Next require middleware and force every page to render
      // dynamically — that would drop static prerendering across the
      // marketing pages. The origin allowlist still blocks loading an
      // attacker-hosted script, which is the more common vector.
      // 'unsafe-eval' is dev-only (React Refresh); production omits it.
      [
        "script-src 'self' 'unsafe-inline'",
        process.env.NODE_ENV === "development" ? "'unsafe-eval'" : "",
        "https://www.google.com https://www.gstatic.com", // reCAPTCHA Enterprise
        "https://connect.facebook.net",                   // Meta Pixel
        "https://www.googletagmanager.com",               // GA4
      ].filter(Boolean).join(" "),
      // Tailwind ships as a stylesheet, but Next still injects inline
      // <style> during hydration, so this cannot be tightened either.
      "style-src 'self' 'unsafe-inline'",
      // next/font self-hosts at build time, so no external font origin.
      "font-src 'self' data:",
      [
        "img-src 'self' data: blob:",
        "https://images.unsplash.com https://cdn.pixabay.com https://upload.wikimedia.org",
        "https://static.wixstatic.com https://*.wixstatic.com",
        "https://www.facebook.com",                       // Pixel beacon
        "https://www.google.com https://www.gstatic.com", // reCAPTCHA
        "https://www.google-analytics.com",
      ].join(" "),
      [
        "connect-src 'self'",
        "https://www.wixapis.com https://*.wixapis.com",  // Wix SDK
        "https://photon.komoot.io",                       // keyless geocoder fallback
        "https://www.google.com",                         // reCAPTCHA
        "https://www.facebook.com",
        "https://www.google-analytics.com https://*.analytics.google.com",
      ].join(" "),
      // reCAPTCHA draws its challenge in an iframe from www.google.com.
      "frame-src 'self' https://www.google.com",
      // No <object>/<embed>, and nothing may re-point relative URLs.
      "object-src 'none'",
      "base-uri 'self'",
      // Forms may only post back to us — blocks an injected form that
      // exfiltrates a half-typed signup to somewhere else.
      "form-action 'self'",
      "frame-ancestors 'none'",
      "upgrade-insecure-requests",
    ].join("; ");

    // Report-Only by default. A CSP that blocks a third-party script the
    // site actually needs breaks things silently and in ways that are hard
    // to attribute, and the externals here (Wix, reCAPTCHA, Meta, GA) each
    // pull subresources that can't be enumerated from source alone. So it
    // ships observing first: violations are reported and nothing is
    // blocked. Once /api/csp-report has been quiet for a few days of real
    // traffic, set CSP_ENFORCE=1 (or flip the default here) to enforce.
    const cspEnforced = process.env.CSP_ENFORCE === "1";

    const securityHeaders = [
      {
        key: cspEnforced
          ? "Content-Security-Policy"
          : "Content-Security-Policy-Report-Only",
        value: `${csp}; report-uri /api/csp-report`,
      },
      { key: "X-Content-Type-Options", value: "nosniff" },
      // DENY, not SAMEORIGIN, to match the CSP's frame-ancestors 'none'.
      // Nothing in the app frames its own pages (reCAPTCHA's iframe is
      // covered by frame-src, which is a different directive), so the
      // looser value bought nothing and would have disagreed with the
      // CSP once it starts enforcing.
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      {
        key: "Permissions-Policy",
        value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
      },
      {
        key: "Strict-Transport-Security",
        value: "max-age=63072000; includeSubDomains; preload",
      },
    ];
    return [
      { source: "/:path*", headers: securityHeaders },
      {
        // Make HTML revalidate on every request.
        //
        // Next's default for a prerendered page is
        // "s-maxage=60, stale-while-revalidate" — and with no limit on the
        // stale window, Cloudflare may keep serving the previous build
        // indefinitely while it refreshes in the background. On a site
        // that deploys on every push that is not a small delay: it served
        // hours-old pages after a fix had shipped, which made a fixed bug
        // look unfixed and sent us chasing it repeatedly. It is also what
        // produced "Refused to execute script … MIME type ('text/html')"
        // errors — stale HTML asking for chunk filenames that a newer
        // build had already replaced.
        //
        // no-cache does not mean "don't store": the browser and CDN still
        // keep a copy and revalidate with the ETag, so an unchanged page
        // costs a 304, not a re-download. Correctness over a few
        // milliseconds, on pages whose whole job is converting a visitor.
        //
        // Everything under _next/static is excluded: those filenames
        // contain a content hash, so they are genuinely immutable and keep
        // their one-year cache. That split — immutable assets, revalidated
        // HTML — is the point.
        // API routes are excluded because several set their own
        // Cache-Control (/api/version needs no-store), and two
        // Cache-Control headers on one response is ambiguous.
        source: "/((?!_next/static|_next/image|api/).*)",
        headers: [{ key: "Cache-Control", value: "no-cache, must-revalidate" }],
      },
      {
        source: "/api/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
    ];
  },
};

export default nextConfig;
