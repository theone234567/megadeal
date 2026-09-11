import Link from "next/link";
import EmailSignupForm from "@/components/EmailSignupForm";
import { CheckIcon, MegaphoneIcon } from "@/components/icons";
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
    <section id="business" className="scroll-mt-24 px-4 pt-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-8 rounded-3xl bg-brand-50 p-6 sm:p-10 lg:grid-cols-2 lg:gap-12">
          <div>
            <span className="text-xs font-bold uppercase tracking-wide text-ember-600">
              For Auckland businesses
            </span>
            <h2 className={`${fredoka.className} mt-2 text-2xl font-bold text-brand-900 sm:text-3xl`}>
              Fill quiet times.
              <br />
              Get more customers.
            </h2>
            <p className="mt-3 text-slate-600">
              Turn empty tables, unused appointments, spare capacity and
              quiet periods into revenue. MegaDeal gives you a simple way to
              promote targeted offers when you need them, while customers
              contact and pay you directly.
            </p>
            <ul className="mt-5 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {BUSINESS_BENEFITS.map((b) => (
                <li key={b} className="flex items-start gap-2 text-sm text-slate-700">
                  <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
                  {b}
                </li>
              ))}
            </ul>
            <p className="mt-5 text-xs text-slate-500">
              We&apos;re not currently set up for pure online/product
              retailers (see{" "}
              <Link href="/megashop" className="underline hover:text-slate-700">
                MegaShop
              </Link>{" "}
              for that) or adult entertainment businesses.
            </p>
          </div>

          {/* The single strongest visual element on the page */}
          <div className="flex flex-col justify-center rounded-2xl bg-white p-6 shadow-card sm:p-8">
            <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-ember-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-ember-700">
              <MegaphoneIcon className="h-3.5 w-3.5" />
              Launch offer
            </span>
            <p className="mt-4 text-lg font-semibold text-slate-500">Up to</p>
            <p className={`${fredoka.className} -mt-1 text-6xl font-extrabold text-ember-600 sm:text-7xl`}>
              6 months
            </p>
            <p className="text-lg font-semibold text-slate-500">advertising free*</p>
            <p className="mt-4 text-sm text-slate-600">
              Join MegaDeal before launch and start building visibility
              before Auckland goes live.
            </p>
            <Link
              href="/list-your-business"
              className="mt-6 flex items-center justify-center gap-2 rounded-full bg-brand-600 py-3.5 text-center font-bold text-white shadow-card transition hover:bg-brand-700 active:scale-95"
            >
              List my business →
            </Link>
            <p className="mt-3 text-center text-sm text-slate-600">
              Use code <span className="font-bold text-brand-700">WELCOME6</span>
            </p>
            <p className="mt-4 text-xs text-slate-500">
              *T&amp;Cs apply. Limited-time offer for eligible new business
              listings.{" "}
              <Link href="/terms" className="underline hover:text-slate-700">
                See terms
              </Link>
              .
            </p>
          </div>
        </div>

        <div className="mx-auto mt-6 max-w-md text-center">
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
