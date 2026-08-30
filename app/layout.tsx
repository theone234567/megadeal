import type { Metadata } from "next";
import "./globals.css";
import { WixProvider } from "@/context/WixProvider";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { SITE_URL, SITE_NAME, SITE_DESCRIPTION } from "@/lib/siteConfig";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — Local deals up to 70% off`,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  alternates: { canonical: "/" },
  robots: { index: true, follow: true },
  openGraph: {
    title: `${SITE_NAME} — Local deals up to 70% off`,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    siteName: SITE_NAME,
    type: "website",
    locale: "en_NZ",
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} — Local deals up to 70% off`,
    description: SITE_DESCRIPTION,
  },
};

export const viewport = {
  themeColor: "#7a17f0",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en-NZ">
      <head>
        {/* Every deal photo and most API calls come from Wix's domains —
            opening the connection before those requests are discovered
            mid-render shaves the DNS/TLS handshake off the critical path. */}
        <link rel="preconnect" href="https://static.wixstatic.com" />
        <link rel="preconnect" href="https://www.wixapis.com" crossOrigin="" />
      </head>
      <body className="min-h-screen bg-white text-slate-900 antialiased">
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              name: SITE_NAME,
              url: SITE_URL,
              description: SITE_DESCRIPTION,
              areaServed: { "@type": "Country", name: "New Zealand" },
            }),
          }}
        />
        <WixProvider>
          <Header />
          {children}
          <Footer />
        </WixProvider>
      </body>
    </html>
  );
}
