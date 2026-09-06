import Link from "next/link";
import { SITE_URL } from "@/lib/siteConfig";
import { safeJsonLd } from "@/lib/safeJsonLd";

export interface Crumb {
  name: string;
  // Omit on the last item — it's the current page, so it isn't a link
  // (matching how Google expects the final breadcrumb to render).
  href?: string;
}

/**
 * Visible breadcrumb trail + matching BreadcrumbList JSON-LD. Google
 * requires the two to describe the same path to be eligible for the
 * breadcrumb rich result (the trail shown under a search listing instead
 * of a bare URL), so this always renders both from one `items` list rather
 * than risking them drifting apart.
 */
export default function Breadcrumbs({ items }: { items: Crumb[] }) {
  const withHome: Crumb[] = [{ name: "Home", href: "/" }, ...items];

  return (
    <>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{
          __html: safeJsonLd({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: withHome.map((item, i) => ({
              "@type": "ListItem",
              position: i + 1,
              name: item.name,
              item: item.href ? `${SITE_URL}${item.href}` : undefined,
            })),
          }),
        }}
      />
      <nav aria-label="Breadcrumb" className="mb-4 flex flex-wrap items-center gap-1.5 text-sm text-slate-500">
        {withHome.map((item, i) => (
          <span key={i} className="flex items-center gap-1.5">
            {i > 0 && <span aria-hidden="true">/</span>}
            {item.href ? (
              <Link href={item.href} className="hover:text-brand-700 hover:underline">
                {item.name}
              </Link>
            ) : (
              <span aria-current="page" className="font-medium text-slate-700">
                {item.name}
              </span>
            )}
          </span>
        ))}
      </nav>
    </>
  );
}
