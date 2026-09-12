"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CATEGORIES } from "@/lib/categories";
import SocialLinks from "./SocialLinks";
import EmailSignupForm from "./EmailSignupForm";
import Logo from "./Logo";

/**
 * Before launch, /category/* pages render the full launched-site chrome
 * over an empty "No deals yet" grid, so linking there from the footer
 * dead-ends every visitor on the pre-launch site. Until we're live, point
 * the whole column at the coming-soon page's category preview instead —
 * which is already what "Home & Car" does, since it has no category page
 * at all (it isn't in lib/categories.ts).
 */
function footerCategories(siteLaunched: boolean) {
  return [
    ...CATEGORIES.map((category) => ({
      name: category.name,
      href: siteLaunched
        ? `/category/${encodeURIComponent(category.name)}`
        : "/coming-soon#categories",
    })),
    { name: "Home & Car", href: "/coming-soon#categories" },
  ];
}

/**
 * `siteLaunched` is passed in from the server layout rather than imported
 * from siteConfig: SITE_LAUNCHED reads a server-only env var (no
 * NEXT_PUBLIC_ prefix), so importing it into this client component would
 * evaluate to `false` in the browser bundle no matter what the real
 * setting is — and disagree with the server render.
 */
export default function Footer({ siteLaunched = false }: { siteLaunched?: boolean }) {
  const FOOTER_CATEGORIES = footerCategories(siteLaunched);
  const pathname = usePathname();
  const isComingSoon = pathname === "/coming-soon";
  const hideOwnABusinessCta = pathname?.startsWith("/list-your-business") || isComingSoon;

  if (isComingSoon) {
    return (
      <footer className="mt-0 border-t border-[#e5e7ef] bg-white">
        <div className="mx-auto flex min-h-[92px] w-[94%] max-w-[960px] flex-col items-center justify-between gap-4 py-4 sm:flex-row">
          <div><Logo className="text-[25px]" /><p className="mt-2 text-[11px] italic text-[#101d7d]">Eat. Do. Stay. Fix. For Less.</p></div>
          <div className="text-center sm:text-right"><nav className="flex justify-center sm:justify-end gap-5 text-xs text-[#111d7c]"><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><Link href="/contact">Contact</Link><SocialLinks /></nav><p className="mt-4 text-[10px] text-slate-400">© 2024 MegaDeal. All rights reserved.　 |　 Auckland, New Zealand</p></div>
        </div>
      </footer>
    );
  }

  return (
    <footer className="mt-16 border-t border-slate-100 bg-slate-50">
      {!hideOwnABusinessCta && (
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-4 rounded-2xl bg-brand-700 px-6 py-6 text-center sm:flex-row sm:text-left">
            <div>
              <h3 className="text-lg font-bold text-white">Own a local business?</h3>
              <p className="text-sm text-brand-100">
                List your deal on MegaDeal and get up to 6 months free advertising — use code <span className="font-bold">WELCOME6</span> at signup.{" "}
                <Link href="/terms" className="text-brand-200 underline hover:text-white">
                  Conditions apply.
                </Link>
              </p>
            </div>
            <Link
              href="/list-your-business"
              className="shrink-0 rounded-full bg-ember-500 px-6 py-3 text-sm font-bold text-white shadow-card transition hover:bg-ember-600"
            >
              List your deal →
            </Link>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-7xl px-4 pb-12 pt-10 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:grid-cols-5">
          <div>
            <h4 className="mb-3 text-sm font-bold text-slate-900">Categories</h4>
            <ul className="space-y-2 text-sm text-slate-600">
              {FOOTER_CATEGORIES.map((category) => (
                <li key={category.name}>
                  <Link href={category.href} className="hover:text-brand-700">
                    {category.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="mb-3 text-sm font-bold text-slate-900">Company</h4>
            <ul className="space-y-2 text-sm text-slate-600">
              <li><Link href="/list-your-business" className="hover:text-brand-700">List your business</Link></li>
              <li><Link href="/about" className="hover:text-brand-700">About MegaDeal</Link></li>
              <li><Link href="/how-it-works" className="hover:text-brand-700">How it works</Link></li>
              <li><Link href="/careers" className="hover:text-brand-700">Careers</Link></li>
              <li><Link href="/coming-soon" className="hover:text-brand-700">Coming soon</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="mb-3 text-sm font-bold text-slate-900">Support</h4>
            <ul className="space-y-2 text-sm text-slate-600">
              <li><Link href="/help" className="hover:text-brand-700">Help centre</Link></li>
              <li><Link href="/redeem" className="hover:text-brand-700">How to redeem a deal</Link></li>
              <li><Link href="/refund-policy" className="hover:text-brand-700">Refund policy</Link></li>
              <li><Link href="/contact" className="hover:text-brand-700">Contact us</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="mb-3 text-sm font-bold text-slate-900">Follow us</h4>
            <SocialLinks />
          </div>
          <div>
            <h4 className="mb-3 text-sm font-bold text-slate-900">Stay in the loop</h4>
            <p className="mb-3 text-sm text-slate-600">Get the best local deals in your inbox every week.</p>
            <EmailSignupForm audience="customer" source="footer" buttonLabel="Join" surface="plain" />
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-6 border-t border-slate-200 pt-6 sm:flex-row">
          <p className="text-center text-sm text-slate-500 sm:text-left">© {new Date().getFullYear()} MegaDeal. All rights reserved.</p>
          <div className="flex gap-4 text-sm text-slate-500">
            <Link href="/terms" className="hover:text-brand-700">Terms</Link>
            <Link href="/privacy" className="hover:text-brand-700">Privacy</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}