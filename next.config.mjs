/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "static.wixstatic.com" },
      { protocol: "https", hostname: "**.wixstatic.com" },
      { protocol: "https", hostname: "cdn.pixabay.com" },
    ],
  },
  async redirects() {
    // The public merchant-signup section has moved twice now: /merchants ->
    // /businesses (less "marketplace where you buy through us" sounding)
    // -> /list-your-business (a clearer, more search-intent-matching URL —
    // "/businesses" read like a directory of businesses to browse, not a
    // signup page, and didn't match how the site's own nav already
    // describes this page: "List your business"). Both old paths redirect
    // straight to the final destination rather than chaining through the
    // intermediate one. Permanent redirects so existing bookmarks, indexed
    // search results, and already-shared referral links (?ref=CODE) keep
    // working — query strings and any #fragment are preserved automatically.
    return [
      { source: "/merchants", destination: "/list-your-business", permanent: true },
      { source: "/merchants/:path*", destination: "/list-your-business/:path*", permanent: true },
      { source: "/businesses", destination: "/list-your-business", permanent: true },
      { source: "/businesses/:path*", destination: "/list-your-business/:path*", permanent: true },
    ];
  },
  async headers() {
    // Deliberately not shipping a Content-Security-Policy here: this app
    // calls several wixapis.com subdomains from the browser and a
    // misconfigured CSP would silently break those requests with no way
    // to verify it live from this environment. These headers are safe,
    // well-understood wins that carry no such risk.
    const securityHeaders = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "SAMEORIGIN" },
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
      // Keep API responses out of any cache/index by default.
      {
        source: "/api/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
    ];
  },
};

export default nextConfig;
