import type { Metadata } from "next";
import EmailSignupForm from "@/components/EmailSignupForm";
import { SITE_URL, SITE_NAME } from "@/lib/siteConfig";

export const metadata: Metadata = {
  title: `MegaShop.co.nz — Coming Soon | ${SITE_NAME}`,
  description: "MegaShop.co.nz is coming soon. Sign up to hear when it launches and get launch specials.",
  alternates: { canonical: `${SITE_URL}/megashop` },
  robots: { index: false, follow: true },
};

export default function MegaShopComingSoonPage() {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center px-4 py-20 text-center">
      <span className="text-4xl">🛍️</span>
      <h1 className="mt-3 text-2xl font-extrabold text-slate-900 sm:text-3xl">
        MegaShop.co.nz — Coming soon
      </h1>
      <p className="mt-3 text-slate-600">
        We&apos;re building a new marketplace alongside MegaDeal. Want to know
        the moment it launches — plus get launch specials before anyone
        else? Pop your email in below.
      </p>

      <div className="mt-6 w-full max-w-md">
        <EmailSignupForm
          audience="customer"
          source="megashop"
          buttonLabel="Notify me"
          accent="ember"
          surface="plain"
        />
      </div>
    </main>
  );
}
