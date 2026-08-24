"use client";

import Link from "next/link";
import { CATEGORIES } from "./CategoryNav";
import SocialLinks from "./SocialLinks";

export default function Footer() {
  return (
    <footer className="mt-16 border-t border-slate-100 bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-between gap-4 rounded-2xl bg-brand-700 px-6 py-6 text-center sm:flex-row sm:text-left">
          <div>
            <h3 className="text-lg font-bold text-white">Own a local business?</h3>
            <p className="text-sm text-brand-100">
              List your deal on MegaDeal and reach new customers today.
            </p>
          </div>
          <Link
            href="/merchants"
            className="shrink-0 rounded-full bg-ember-500 px-6 py-3 text-sm font-bold text-white shadow-card transition hover:bg-ember-600"
          >
            List your deal →
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 pb-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
          <div>
            <h4 className="mb-3 text-sm font-bold text-slate-900">Categories</h4>
            <ul className="space-y-2 text-sm text-slate-600">
              {CATEGORIES.map((c) => (
                <li key={c.name}>
                  <Link
                    href={`/category/${encodeURIComponent(c.name)}`}
                    className="hover:text-brand-700"
                  >
                    {c.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="mb-3 text-sm font-bold text-slate-900">Company</h4>
            <ul className="space-y-2 text-sm text-slate-600">
              <li>
                <Link href="/about" className="hover:text-brand-700">
                  About MegaDeal
                </Link>
              </li>
              <li>
                <Link href="/how-it-works" className="hover:text-brand-700">
                  How it works
                </Link>
              </li>
              <li>
                <Link href="/merchants" className="hover:text-brand-700">
                  Merchants: list your deal
                </Link>
              </li>
              <li>
                <Link href="/careers" className="hover:text-brand-700">
                  Careers
                </Link>
              </li>
              <li>
                <Link href="/coming-soon" className="hover:text-brand-700">
                  What&apos;s coming next
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="mb-3 text-sm font-bold text-slate-900">Support</h4>
            <ul className="space-y-2 text-sm text-slate-600">
              <li>
                <Link href="/help" className="hover:text-brand-700">
                  Help centre
                </Link>
              </li>
              <li>
                <Link href="/redeem" className="hover:text-brand-700">
                  Redeem a voucher
                </Link>
              </li>
              <li>
                <Link href="/refund-policy" className="hover:text-brand-700">
                  Refund policy
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-brand-700">
                  Contact us
                </Link>
              </li>
              <li>
                <Link href="/portal" className="hover:text-brand-700">
                  Sign in
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="mb-3 text-sm font-bold text-slate-900">Stay in the loop</h4>
            <p className="mb-3 text-sm text-slate-600">
              Get the best local deals in your inbox every week.
            </p>
            <form className="flex gap-2" onSubmit={(e) => e.preventDefault()}>
              <input
                type="email"
                required
                placeholder="you@example.com"
                className="w-full min-w-0 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-400"
              />
              <button
                type="submit"
                className="shrink-0 rounded-full bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
              >
                Join
              </button>
            </form>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-6 border-t border-slate-200 pt-6 sm:flex-row">
          <SocialLinks />
          <p className="text-center text-sm text-slate-500 sm:text-left">
            © {new Date().getFullYear()} MegaDeal. Deals inspired by
            megadeal.co.nz &amp; Groupon — powered by Wix Headless.
          </p>
          <div className="flex gap-4 text-sm text-slate-500">
            <Link href="/terms" className="hover:text-brand-700">
              Terms
            </Link>
            <Link href="/privacy" className="hover:text-brand-700">
              Privacy
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
