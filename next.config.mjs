/** @type {import('next').NextConfig} */
const nextConfig = {
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
      {
        source: "/api/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
    ];
  },
};

export default nextConfig;
