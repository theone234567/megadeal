import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { SITE_URL, SITE_NAME } from "@/lib/siteConfig";
import { plusJakartaSans, fredoka } from "@/lib/fonts";
import EmailSignupForm from "@/components/EmailSignupForm";
import ElephantMascot from "@/components/ElephantMascot";
import AucklandSkylineArt from "@/components/comingSoon/AucklandSkylineArt";
import {
  HeartIcon,
  StoreIcon,
  SearchIcon,
  PhoneIcon,
  CheckIcon,
} from "@/components/icons";

const TITLE = "MegaDeal is Coming Soon — Local Deals for New Zealand";
const DESCRIPTION =
  "MegaDeal is launching in Auckland first, connecting locals with great-value offers from local businesses. Wellington, Christchurch, Queenstown and Hamilton follow next.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: `${SITE_URL}/coming-soon` },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: `${SITE_URL}/coming-soon`,
    siteName: SITE_NAME,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
};

const categories = [
  {
    label: "Food & Drink",
    image:
      "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=900&q=80",
  },
  {
    label: "Spas & Beauty",
    image:
      "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=900&q=80",
  },
  {
    label: "Gyms & Fitness",
    image:
      "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=900&q=80",
  },
  {
    label: "Things to Do",
    image:
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=80",
  },
  {
    label: "Getaways & Stays",
    image:
      "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=900&q=80",
  },
  {
    label: "Home & Auto Services",
    image:
      "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=900&q=80",
  },
];

const businessBenefits = [
  "No commission on sales",
  "Customers deal directly with you",
  "You control your offer and availability",
  "Promote quieter days and times",
  "Fill unused appointments or capacity",
  "Reach new local customers",
  "Keep 100% of the sale",
];

const rollout = [
  ["Auckland", "Launching first"],
  ["Wellington", "Coming next"],
  ["Christchurch", "Coming soon"],
  ["Queenstown", "Coming soon"],
  ["Hamilton", "Coming soon"],
];

export default function ComingSoonPage() {
  return (
    <main
      className={`${plusJakartaSans.className} min-h-screen overflow-hidden bg-white text-[#27135c]`}
    >
      <section className="px-5 pb-10 pt-5 sm:px-8 lg:px-10 lg:pb-14">
        <div className="mx-auto max-w-[1360px]">
          <header className="flex items-center justify-between gap-4 py-2">
            <Link href="/coming-soon" className="inline-flex items-center gap-2" aria-label="MegaDeal coming soon">
              <span className={`${fredoka.className} text-[28px] font-extrabold tracking-[-0.04em] text-[#5717c8] sm:text-[32px]`}>
                Mega
              </span>
              <span className={`${fredoka.className} -ml-3 rounded-[14px] bg-[#ed1695] px-2.5 py-1 text-[26px] font-extrabold tracking-[-0.04em] text-white sm:text-[30px]`}>
                Deal
              </span>
              <span className="hidden sm:block scale-[0.42] origin-left -mr-12">
                <ElephantMascot />
              </span>
            </Link>
            <Link
              href="/portal"
              className="text-sm font-bold text-[#321475] transition hover:text-[#ed1695]"
            >
              Business sign in →
            </Link>
          </header>

          <div className="mt-8 grid items-start gap-10 lg:grid-cols-[0.92fr_1.08fr] lg:gap-8">
            <div className="pt-2 lg:pt-9">
              <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-[#ed1695] sm:text-sm">
                Coming soon
              </p>
              <h1
                className={`${fredoka.className} mt-4 max-w-[700px] text-[44px] font-extrabold leading-[0.96] tracking-[-0.04em] text-[#321475] sm:text-[58px] lg:text-[68px]`}
              >
                Auckland, get ready for better days out.
              </h1>
              <p className="mt-5 max-w-xl text-lg font-semibold leading-7 text-[#352a59] sm:text-xl">
                Local deals. Local businesses. Real value for Aucklanders.
              </p>
              <p className="mt-2 max-w-xl text-base leading-7 text-slate-600">
                MegaDeal is launching in Auckland first — with Wellington,
                Christchurch, Queenstown and Hamilton to follow.
              </p>

              <div className="mt-7 grid gap-4 sm:grid-cols-2">
                <div className="rounded-[24px] border border-[#ece5ff] bg-[#f8f4ff] p-5 shadow-[0_8px_30px_rgba(86,36,179,0.06)] sm:p-6">
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-[#ed1695] shadow-sm">
                    <HeartIcon className="h-6 w-6" />
                  </span>
                  <h2 className={`${fredoka.className} mt-4 text-2xl font-bold text-[#321475]`}>
                    Love a good deal?
                  </h2>
                  <p className="mt-2 min-h-[66px] text-sm leading-6 text-slate-600">
                    Be the first to know when we launch in Auckland and get early access to local offers.
                  </p>
                  <a
                    href="#get-notified"
                    className="mt-5 inline-flex w-full items-center justify-center rounded-full bg-[#ed1695] px-5 py-3 text-sm font-extrabold text-white transition hover:bg-[#d90f86]"
                  >
                    Get launch updates →
                  </a>
                </div>

                <div className="rounded-[24px] border border-[#f4e6ef] bg-[#fff8f3] p-5 shadow-[0_8px_30px_rgba(86,36,179,0.06)] sm:p-6">
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-[#7118e7] shadow-sm">
                    <StoreIcon className="h-6 w-6" />
                  </span>
                  <h2 className={`${fredoka.className} mt-4 text-2xl font-bold text-[#321475]`}>
                    Run a local business?
                  </h2>
                  <p className="mt-2 min-h-[66px] text-sm leading-6 text-slate-600">
                    Join before launch, reach new customers and get <strong className="font-extrabold text-[#ed1695]">up to 6 months advertising free.*</strong>
                  </p>
                  <Link
                    href="/list-your-business"
                    className="mt-5 inline-flex w-full items-center justify-center rounded-full bg-[#7118e7] px-5 py-3 text-sm font-extrabold text-white transition hover:bg-[#5f12c9]"
                  >
                    List my business →
                  </Link>
                </div>
              </div>
            </div>

            <div className="relative mx-auto w-full max-w-[700px] lg:pt-1">
              <div className="relative aspect-[1.12/1] overflow-hidden rounded-[44%_56%_52%_48%/40%_42%_58%_60%] bg-[#efe8ff]">
                <AucklandSkylineArt className="h-full w-full" />
                <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-[#40257d]/10 to-transparent" />
                <div className="absolute right-5 top-8 rounded-full bg-white/90 px-4 py-2 text-xs font-extrabold text-[#5717c8] shadow-sm backdrop-blur sm:right-10 sm:top-10 sm:text-sm">
                  Auckland launches first
                </div>
              </div>
              <div className="absolute -bottom-5 right-2 scale-[0.7] sm:-bottom-9 sm:right-7 sm:scale-[0.85]">
                <ElephantMascot className="drop-shadow-xl" />
              </div>
            </div>
          </div>

          <div className="mt-10 grid gap-4 border-y border-[#eee9f7] py-5 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["○", "No vouchers to buy"],
              ["♥", "Support local businesses"],
              ["●", "Customers deal direct"],
              ["⌖", "Auckland first, then more NZ cities"],
            ].map(([icon, text]) => (
              <div key={text} className="flex items-center gap-3 text-sm font-bold text-[#352a59]">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#f5f1ff] text-[#7118e7]">
                  {icon}
                </span>
                {text}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 py-6 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-[1360px] rounded-[28px] bg-[#f7f2ff] px-5 py-7 sm:px-8 lg:px-10 lg:py-9">
          <h2 className={`${fredoka.className} text-3xl font-extrabold text-[#321475] sm:text-4xl`}>
            How MegaDeal will work
          </h2>
          <div className="mt-7 grid gap-5 lg:grid-cols-3 lg:gap-8">
            {[
              ["1", "Find a deal", "Browse offers from local businesses.", <SearchIcon key="search" className="h-7 w-7" />],
              ["2", "Get the deal code", "No payment or voucher purchase required.", <span key="ticket" className="text-2xl font-black">⌁</span>],
              ["3", "Book direct & enjoy", "Contact the business, quote your code and pay them directly.", <PhoneIcon key="phone" className="h-7 w-7" />],
            ].map(([number, title, copy, icon]) => (
              <div key={String(title)} className="flex items-start gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#7118e7] text-sm font-extrabold text-white">
                  {number}
                </span>
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-white text-[#7118e7] shadow-sm">
                  {icon}
                </span>
                <div className="pt-1">
                  <h3 className="font-extrabold text-[#321475]">{title}</h3>
                  <p className="mt-1 text-sm leading-5 text-slate-600">{copy}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 py-8 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-[1360px]">
          <h2 className={`${fredoka.className} text-3xl font-extrabold text-[#321475] sm:text-4xl`}>
            Deals across more of what you love
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 sm:text-base">
            MegaDeal will feature offers across dining, wellness, fitness, experiences, getaways and everyday services.
          </p>
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {categories.map((category) => (
              <div key={category.label} className="group">
                <div className="relative aspect-[1.28/1] overflow-hidden rounded-2xl bg-slate-100">
                  <Image
                    src={category.image}
                    alt={`Generic ${category.label.toLowerCase()} category image`}
                    fill
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 16vw"
                    className="object-cover transition duration-300 group-hover:scale-[1.03]"
                  />
                </div>
                <p className="mt-2 text-center text-sm font-extrabold text-[#321475]">
                  {category.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="get-notified" className="scroll-mt-24 px-5 py-6 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-[1360px] rounded-[28px] bg-[#f7f2ff] px-5 py-7 sm:px-8 lg:px-10 lg:py-9">
          <div className="grid items-center gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:gap-10">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-[#7118e7]">Be first in line</p>
              <h2 className={`${fredoka.className} mt-2 text-3xl font-extrabold text-[#321475] sm:text-4xl`}>
                Be the first to know
              </h2>
              <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600 sm:text-base">
                Sign up and we&apos;ll let you know when MegaDeal launches in Auckland, plus early access to special offers.
              </p>
            </div>
            <div>
              <EmailSignupForm
                audience="customer"
                source="coming-soon"
                buttonLabel="Keep me posted →"
                accent="brand"
                surface="plain"
              />
              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs font-semibold text-slate-500">
                <span>✓ Free to join</span>
                <span>✓ No spam</span>
                <span>✓ Unsubscribe anytime</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="business" className="scroll-mt-24 px-5 py-8 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-[1360px]">
          <div className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="rounded-[28px] border border-[#eee6fb] bg-[#fffafc] p-6 sm:p-8 lg:p-10">
              <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-[#ed1695]">
                For Auckland businesses
              </p>
              <h2 className={`${fredoka.className} mt-3 text-4xl font-extrabold leading-[1.02] text-[#321475] sm:text-5xl`}>
                Fill quiet times.
                <br />
                Get more customers.
              </h2>
              <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600">
                Turn empty tables, unused appointments, spare rooms, available seats and quiet periods into revenue. You decide when your offer runs, customers contact and pay you directly, and you keep the sale.
              </p>
              <ul className="mt-7 grid gap-3 sm:grid-cols-2">
                {businessBenefits.map((benefit) => (
                  <li key={benefit} className="flex items-start gap-2.5 text-sm font-semibold leading-5 text-[#3b3157]">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#eee5ff] text-[#7118e7]">
                      <CheckIcon className="h-3.5 w-3.5" />
                    </span>
                    {benefit}
                  </li>
                ))}
              </ul>
              <div className="mt-8 flex flex-wrap items-center gap-4">
                <Link
                  href="/list-your-business"
                  className="inline-flex items-center justify-center rounded-full bg-[#7118e7] px-7 py-3.5 text-sm font-extrabold text-white transition hover:bg-[#5f12c9]"
                >
                  List my business →
                </Link>
                <span className="text-sm font-semibold text-slate-600">
                  Use code <strong className="text-[#321475] underline decoration-[#ed1695] decoration-2 underline-offset-4">WELCOME6</strong>
                </span>
              </div>
            </div>

            <div className="relative overflow-hidden rounded-[28px] bg-[#321475] p-7 text-center text-white sm:p-10 lg:min-h-[520px] lg:p-12">
              <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[#ed1695]/20 blur-2xl" />
              <div className="absolute -bottom-24 -left-20 h-72 w-72 rounded-full bg-[#8d56ff]/20 blur-2xl" />
              <div className="relative flex h-full flex-col items-center justify-center">
                <span className="rounded-full bg-white/10 px-4 py-2 text-xs font-extrabold uppercase tracking-[0.22em] text-[#ffd0ec]">
                  Launch offer
                </span>
                <p className="mt-7 text-lg font-bold text-[#dacdff]">Up to</p>
                <p className={`${fredoka.className} mt-1 text-[68px] font-extrabold leading-[0.8] tracking-[-0.05em] text-[#ff3aac] sm:text-[92px]`}>
                  6 months
                </p>
                <p className={`${fredoka.className} mt-4 text-3xl font-extrabold leading-tight text-white sm:text-4xl`}>
                  advertising free*
                </p>
                <p className="mx-auto mt-6 max-w-sm text-sm leading-6 text-[#ddd2ff]">
                  Join MegaDeal before launch and start building visibility before Auckland goes live.
                </p>
                <Link
                  href="/list-your-business"
                  className="mt-7 inline-flex w-full max-w-sm items-center justify-center rounded-full bg-[#ed1695] px-7 py-4 text-sm font-extrabold text-white transition hover:bg-[#d90f86]"
                >
                  Claim the launch offer →
                </Link>
                <p className="mt-4 text-sm font-bold text-white">Code: WELCOME6</p>
                <p className="mt-6 max-w-md text-xs leading-5 text-[#cfc2ef]">
                  *T&amp;Cs apply. Limited-time offer for eligible new business listings. <Link href="/terms" className="underline underline-offset-2 hover:text-white">See terms</Link>.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-5 py-6 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-[1360px] rounded-[28px] border border-[#eee8f5] bg-white px-6 py-7 sm:px-8 lg:px-10">
          <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-[#7118e7]">Our launch plan</p>
              <h2 className={`${fredoka.className} mt-2 text-3xl font-extrabold text-[#321475] sm:text-4xl`}>
                Auckland first. Then more of New Zealand.
              </h2>
              <p className="mt-3 max-w-xl text-sm leading-6 text-slate-600">
                We&apos;re starting local, learning fast and expanding city by city.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-5">
              {rollout.map(([city, status], index) => (
                <div key={city} className="rounded-2xl bg-[#f8f5fd] p-4">
                  <span className={`mb-3 block h-2.5 w-2.5 rounded-full ${index === 0 ? "bg-[#ed1695]" : "bg-[#b9a8df]"}`} />
                  <p className="font-extrabold text-[#321475]">{city}</p>
                  <p className={`mt-1 text-xs font-semibold ${index === 0 ? "text-[#ed1695]" : "text-slate-500"}`}>
                    {status}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <footer className="mt-8 border-t border-[#eee9f7] px-5 py-8 sm:px-8 lg:px-10">
        <div className="mx-auto flex max-w-[1360px] flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2">
              <span className={`${fredoka.className} text-2xl font-extrabold tracking-[-0.04em] text-[#5717c8]`}>Mega</span>
              <span className={`${fredoka.className} -ml-2 rounded-xl bg-[#ed1695] px-2 py-0.5 text-xl font-extrabold text-white`}>Deal</span>
            </div>
            <p className="mt-2 text-xs font-semibold text-slate-500">Auckland, New Zealand</p>
          </div>
          <nav className="flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold text-slate-600" aria-label="Footer">
            <Link href="/privacy" className="hover:text-[#7118e7]">Privacy</Link>
            <Link href="/terms" className="hover:text-[#7118e7]">Terms</Link>
            <Link href="/contact" className="hover:text-[#7118e7]">Contact</Link>
          </nav>
        </div>
      </footer>
    </main>
  );
}
