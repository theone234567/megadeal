import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { fetchMegaShopProductBySlugForServer } from "@/lib/fetchMegaShopServer";
import { SITE_URL, SITE_NAME } from "@/lib/siteConfig";
import { formatMoney } from "@/lib/format";

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const product = await fetchMegaShopProductBySlugForServer(params.slug);
  if (!product) return { title: `Product not found | ${SITE_NAME}` };

  const price = formatMoney(product.now, product.currency, product.formattedNow);
  const title = `${product.name} — ${price} | MegaShop.co.nz`;
  const description = product.description.slice(0, 155) || `${product.name} for ${price} on MegaShop.co.nz.`;
  const url = `${SITE_URL}/megashop/${product.slug}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: SITE_NAME,
      images: product.image ? [{ url: product.image, width: 1200, height: 900, alt: product.name }] : undefined,
      type: "website",
    },
    twitter: { card: "summary_large_image", title, description, images: product.image ? [product.image] : undefined },
  };
}

export default async function MegaShopProductPage({ params }: { params: { slug: string } }) {
  const product = await fetchMegaShopProductBySlugForServer(params.slug);
  if (!product) notFound();

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <Link href="/megashop" className="text-sm text-slate-500 hover:text-brand-700">
        ← Back to MegaShop
      </Link>

      <div className="mt-4 grid grid-cols-1 gap-8 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-slate-100">
            {product.image ? (
              <Image
                src={product.image}
                alt={product.name}
                fill
                sizes="(min-width: 1024px) 60vw, 100vw"
                className="object-cover"
                priority
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-6xl text-slate-300">
                🛍️
              </div>
            )}
          </div>

          {product.description && (
            <div className="mt-6">
              <h2 className="mb-2 text-lg font-bold text-slate-900">Description</h2>
              <p className="max-w-none whitespace-pre-line text-sm leading-relaxed text-slate-600">
                {product.description}
              </p>
            </div>
          )}
        </div>

        <div className="lg:col-span-2">
          <div className="sticky top-24 rounded-2xl border border-slate-100 bg-white p-6 shadow-card">
            <h1 className="text-2xl font-extrabold leading-snug text-slate-900">{product.name}</h1>

            <div className="mt-4 flex items-baseline gap-3">
              <span className="text-3xl font-extrabold text-slate-900">
                {formatMoney(product.now, product.currency, product.formattedNow)}
              </span>
              {product.was > product.now && (
                <>
                  <span className="text-lg text-slate-400 line-through">
                    {formatMoney(product.was, product.currency, product.formattedWas)}
                  </span>
                  <span className="rounded-full bg-ember-50 px-2 py-0.5 text-sm font-bold text-ember-600">
                    {product.discountPercent}% off
                  </span>
                </>
              )}
            </div>
            {!product.inStock ? (
              <p className="mt-1 text-sm font-bold text-slate-500">Sold out</p>
            ) : product.quantityAvailable !== null && product.quantityAvailable <= 5 ? (
              <p className="mt-1 text-sm font-bold text-red-600">Only {product.quantityAvailable} left</p>
            ) : null}

            <div className="mt-6">
              <button
                type="button"
                disabled
                className="w-full cursor-not-allowed rounded-full bg-slate-200 py-3 text-center font-bold text-slate-500"
              >
                Checkout coming soon
              </button>
              <p className="mt-2 text-center text-xs text-slate-400">
                MegaShop isn&apos;t open for purchases yet — check back soon.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
