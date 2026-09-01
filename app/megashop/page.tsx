import type { Metadata } from "next";
import Link from "next/link";
import EmailSignupForm from "@/components/EmailSignupForm";
import MegaShopProductCard from "@/components/MegaShopProductCard";
import { SITE_URL, SITE_NAME } from "@/lib/siteConfig";
import { fetchMegaShopProductsForServer } from "@/lib/fetchMegaShopServer";

export async function generateMetadata(): Promise<Metadata> {
  const products = await fetchMegaShopProductsForServer();
  if (products.length === 0) {
    return {
      title: `MegaShop.co.nz — Coming Soon | ${SITE_NAME}`,
      description: "MegaShop.co.nz is coming soon. Sign up to hear when it launches and get launch specials.",
      alternates: { canonical: `${SITE_URL}/megashop` },
      robots: { index: false, follow: true },
    };
  }
  return {
    title: `MegaShop.co.nz — Shop | ${SITE_NAME}`,
    description: "Browse MegaShop.co.nz's product catalog.",
    alternates: { canonical: `${SITE_URL}/megashop` },
  };
}

export default async function MegaShopPage() {
  const products = await fetchMegaShopProductsForServer();

  if (products.length === 0) {
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

        <div className="mt-14 w-full max-w-md border-t border-slate-100 pt-10">
          <span className="text-3xl">🤝</span>
          <h2 className="mt-2 text-xl font-bold text-slate-900">
            Wholesale suppliers wanted
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            We&apos;re looking for wholesale suppliers of popular branded
            products for MegaShop.co.nz. If that&apos;s you, send us an email.
          </p>
          <Link
            href="/contact"
            className="mt-4 inline-block rounded-full bg-brand-600 px-6 py-2.5 text-sm font-bold text-white shadow-card transition hover:bg-brand-700 active:scale-95"
          >
            Get in touch →
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-extrabold text-slate-900">MegaShop.co.nz</h1>
      <p className="mt-1 text-sm text-slate-500">
        Shopping is coming soon — checkout isn&apos;t live yet, but here&apos;s a look at what&apos;s in store.
      </p>
      <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-5 md:grid-cols-3 xl:grid-cols-4">
        {products.map((product) => (
          <MegaShopProductCard key={product.id} product={product} />
        ))}
      </div>
    </main>
  );
}
