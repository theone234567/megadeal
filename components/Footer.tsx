"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CATEGORIES } from "@/lib/categories";
import SocialLinks from "./SocialLinks";
import EmailSignupForm from "./EmailSignupForm";
import ElephantMascot from "./ElephantMascot";
import { fredoka } from "@/lib/fonts";

export default function Footer() {
  const pathname = usePathname();
  const isComingSoon = pathname === "/coming-soon";
  const hideOwnABusinessCta = pathname?.startsWith("/list-your-business");

  if (isComingSoon) {
    return (
      <footer className="mt-10 border-t border-[#eee8f6] bg-white">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-7 px-5 py-8 sm:px-8 lg:flex-row lg:items-end lg:justify-between lg:px-10">
          <div>
            <Link
              href="/coming-soon"
              aria-label="MegaDeal coming soon"
              className={`${fredoka.className} inline-flex items-center gap-1`}
            >
              <span className="text-2xl font-bold tracking-[-0.045em] text-brand-700">Mega</span>
              <span className="-rotate-2 rounded-[12px] bg-ember-500 px-2 py-0.5 text-2xl font-bold tracking-[-0.045em] text-white">
                Deal
              </span>
              <span className="ml-0.5 origin-left scale-[0.7]">
                <ElephantMascot className="-rotate-3" />
              </span>
            </Link>
            <p className="mt-1 text-xs font-semibold italic text-[#5e4a8d]">
              Eat. Do. Stay. Fix. For Less.
            </p>
          </div>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
            <nav className="flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold text-[#392c65]" aria-label="Footer">
              <Link href="/privacy" className="hover:text-brand-700">Privacy</Link>
              <Link href="/terms" className="hover:text-brand-700">Terms</Link>
              <Link href="/contact" className="hover:text-brand-700">Contact</Link>
            </nav>
            <SocialLinks />
          </div>
        </div>
        <div className="mx-auto flex max-w-[1440px] flex-col gap-1 px-5 pb-7 text-xs text-slate-400 sm:px-8 sm:flex-row sm:items-center sm:justify-between lg:px-10">
          <span>© {new Date().getFullYear()} MegaDeal. All rights reserved.</span>
          <span>Auckland, New Zealand</span>
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
                List your deal on MegaDeal and get up to 6 months free advertising — use code{" "}
                <span className="font-bold">WELCOME6</span> at signup.{" "}
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

      <div className="mx-auto max-w-7xl px-4 pb-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:grid-cols-5">
          <div>
            <h4 className="mb-3 text-sm font-bold text-slate-900">Categories</h4>
            <ul className="space-y-2 text-sm text-slate-600">
              {CATEGORIES.map((c) => (
                <li key={c.name}>
                  <Link href={`/category/${encodeURIComponent(c.name)}`} className="hover:text-brand-700">
                    {c.name}
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
