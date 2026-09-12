import Link from "next/link";
import EmailSignupForm from "@/components/EmailSignupForm";
import { CheckIcon } from "@/components/icons";
import { fredoka } from "@/lib/fonts";

const BUSINESS_BENEFITS = [
  "No commission on sales",
  "Customers deal directly with you",
  "You control your offer and availability",
  "Promote quieter days and times",
  "Fill unused appointments or capacity",
  "Reach new local customers",
  "Keep 100% of the sale",
];

export default function BusinessLaunchOffer() {
  return (
    <section id="business" className="scroll-mt-24 px-6 pt-10 lg:px-10">
      <div className="mx-auto max-w-[1360px]">
        <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
          <div>
            <span className="text-xs font-bold uppercase tracking-wide text-ember-600">
              For Auckland businesses
            </span>
            <h2 className={`${fredoka.className} mt-2 text-3xl font-bold leading-tight text-brand-900 sm:text-4xl`}>
              Fill quiet times.
              <br />
              Get more customers.
            </h2>
            <p className="mt-4 text-slate-600">
              Turn empty tables, unused appointments, spare capacity and
              quiet periods into revenue. MegaDeal gives you a simple way to
              promote targeted offers when you need them, while customers
              contact and pay you directly.
            </p>
            <ul className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {BUSINESS_BENEFITS.map((b) => (
                <li key={b} className="flex items-start gap-2 text-sm text-slate-700">
                  <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
                  {b}
                </li>
              ))}
            </ul>
            <p className="mt-6 text-xs text-slate-500">
              We&apos;re not currently set up for pure online/product
              retailers (see{" "}
              <Link href="/megashop" className="underline hover:text-slate-700">
                MegaShop
              </Link>{" "}
              for that) or adult entertainment businesses.
            </p>
          </div>

          {/* The single strongest visual element on the page */}
          <div className="flex flex-col justify-center rounded-2xl bg-brand-900 p-6 text-center sm:p-10">
            <span className="mx-auto inline-flex w-fit items-center rounded-full bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-wide text-ember-300">
              Launch offer
            </span>
            <p className="mt-5 text-lg font-semibold text-brand-200">Up to</p>
            <p className={`${fredoka.className} -mt-1 text-7xl font-extrabold leading-none text-white sm:text-8xl`}>
              6 months
            </p>
            <p className="mt-1 text-lg font-semibold text-brand-200">advertising free*</p>
            <p className="mx-auto mt-5 max-w-xs text-sm text-brand-100">
              Join MegaDeal before launch and start building visibility
              before Auckland goes live.
            </p>
            <Link
              href="/list-your-business"
              className="mx-auto mt-6 flex w-full max-w-xs items-center justify-center gap-2 rounded-full bg-ember-500 py-3.5 text-center font-bold text-white transition hover:bg-ember-600 active:scale-95"
            >
              List my business →
            </Link>
            <p className="mt-3 text-sm text-brand-100">
              Use code <span className="font-bold text-white">WELCOME6</span>
            </p>
            <p className="mx-auto mt-4 max-w-xs text-xs text-brand-300">
              *T&amp;Cs apply. Limited-time offer for eligible new business
              listings.{" "}
              <Link href="/terms" className="underline hover:text-white">
                See terms
              </Link>
              .
            </p>
          </div>
        </div>

        <div className="mx-auto mt-8 max-w-md text-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Not ready to sign up? Get notified at launch instead
          </p>
          <div className="mt-3">
            <EmailSignupForm
              audience="merchant"
              source="coming-soon-business"
              buttonLabel="Notify me"
              accent="brand"
              surface="plain"
              center
            />
          </div>
        </div>
      </div>
    </section>
  );
}
