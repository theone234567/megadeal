"use client";

import Link from "next/link";
import { CATEGORIES } from "./CategoryNav";

export default function Footer() {
  return (
    <footer className="mt-16 border-t border-slate-100 bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
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
              <li>About MegaDeal</li>
              <li>How it works</li>
              <li>Merchants: list your deal</li>
              <li>Careers</li>
            </ul>
          </div>
          <div>
            <h4 className="mb-3 text-sm font-bold text-slate-900">Support</h4>
            <ul className="space-y-2 text-sm text-slate-600">
              <li>Help centre</li>
              <li>Redeem a voucher</li>
              <li>Refund policy</li>
              <li>Contact us</li>
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

        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-slate-200 pt-6 text-sm text-slate-500 sm:flex-row">
          <p>
            © {new Date().getFullYear()} MegaDeal. Deals inspired by
            megadeal.co.nz &amp; Groupon — powered by Wix Headless.
          </p>
          <div className="flex gap-4">
            <span>Terms</span>
            <span>Privacy</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
