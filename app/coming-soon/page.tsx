import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { SITE_URL, SITE_NAME } from "@/lib/siteConfig";
import { fredoka, plusJakartaSans } from "@/lib/fonts";
import EmailSignupForm from "@/components/EmailSignupForm";
import ElephantMascot from "@/components/ElephantMascot";
import {
  CheckIcon,
  CompassIcon,
  DumbbellIcon,
  FlowerIcon,
  LeafIcon,
  MapPinIcon,
  MegaphoneIcon,
  PhoneIcon,
  SearchIcon,
  StoreIcon,
  SuitcaseIcon,
  TicketIcon,
  UsersIcon,
  UtensilsIcon,
  WrenchIcon,
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

const AUCKLAND_IMAGE =
  "https://upload.wikimedia.org/wikipedia/commons/3/37/Auckland_CBD_skyline_from_Waitemata_Harbour_entrance.jpg";

const categories = [
  {
    label: "Food & Drink",
    image:
      "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=900&q=80",
    icon: UtensilsIcon,
  },
  {
    label: "Spas & Beauty",
    image:
      "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=900&q=80",
    icon: FlowerIcon,
  },
  {
    label: "Gyms & Fitness",
    image:
      "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=900&q=80",
    icon: DumbbellIcon,
  },
  {
    label: "Things to Do",
    image:
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=80",
    icon: CompassIcon,
  },
  {
    label: "Getaways & Stays",
    image:
      "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=900&q=80",
    icon: SuitcaseIcon,
  },
  {
    label: "Home & Auto Services",
    image:
      "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=900&q=80",
    icon: WrenchIcon,
  },
];

const rollout = [
  ["Auckland", "Launching soon"],
  ["Wellington", "Coming next"],
  ["Christchurch", "Coming soon"],
  ["Queenstown", "Coming soon"],
  ["Hamilton", "Coming soon"],
];

const businessBenefits = [
  "No commission on sales",
  "Customers deal directly with you",
  "You control your offer and availability",
  "Reach new local customers",
  "A simple way to fill quieter periods",
];

export default function ComingSoonPage() {
  return (
    <main className={`${plusJakartaSans.className} overflow-x-hidden bg-white text-[#201744]`}>
      <section className="px-5 pb-8 pt-2 sm:px-8 lg:px-10 lg:pb-10">
        <div className="mx-auto max-w-[1180px]">
          <div className="grid items-start gap-8 lg:grid-cols-[0.92fr_1.08fr] lg:gap-12">
            <div className="pt-7 lg:pt-10">
              <p className="text-xs font-extrabold uppercase tracking-[0.24em] text-[#ef159c] sm:text-sm">
                Coming soon
              </p>
              <h1
                className={`${fredoka.className} mt-3 max-w-[560px] text-[44px] font-bold leading-[0.98] tracking-[-0.045em] text-[#30107d] sm:text-[58px] lg:text-[64px]`}
              >
                Auckland, get ready for better days out.
              </h1>
              <span className="mt-4 block h-1.5 w-48 rounded-full bg-[#ef159c] sm:w-56" />

              <div className="mt-5 max-w-[580px] text-[15px] leading-6 text-[#433968] sm:text-[17px] sm:leading-7">
                <p className="font-bold text-[#2f2262]">Local deals. Local businesses. Real value for Aucklanders.</p>
                <p className="mt-1">
                  MegaDeal is launching in Auckland first — with Wellington, Christchurch, Queenstown and Hamilton to follow.
                </p>
              </div>

              <div className="mt-7 grid gap-4 sm:grid-cols-2">
                <div className="flex min-h-[242px] flex-col rounded-[18px] border border-[#e7e1f1] bg-white p-5 shadow-[0_10px_30px_rgba(53,17,126,0.07)] sm:p-6">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#eee7ff] text-[#5c25d9]">
                    <TicketIcon className="h-6 w-6" />
                  </span>
                  <h2 className={`${fredoka.className} mt-4 text-[25px] font-bold leading-tight text-[#30107d]`}>
                    Love a good deal?
                  </h2>
                  <p className="mt-2 flex-1 text-sm leading-5 text-[#51486f]">
                    Be the first to know when we launch in Auckland and get early access to local offers.
                  </p>
                  <a
                    href="#get-notified"
                    className="mt-5 inline-flex h-11 items-center justify-center rounded-full bg-[#35117e] px-5 text-sm font-extrabold text-white transition hover:bg-[#4a1ab0]"
                  >
                    Get launch updates →
                  </a>
                </div>

                <div className="flex min-h-[242px] flex-col rounded-[18px] bg-[#35117e] p-5 text-white shadow-[0_14px_34px_rgba(53,17,126,0.20)] sm:p-6">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/12 text-white">
                    <StoreIcon className="h-6 w-6" />
                  </span>
                  <h2 className={`${fredoka.className} mt-4 text-[25px] font-bold leading-tight text-white`}>
                    Run a local business?
                  </h2>
                  <p className="mt-2 flex-1 text-sm leading-5 text-[#e8defd]">
                    Join before launch and reach new customers with <strong className="font-extrabold text-white">up to 6 months advertising free.*</strong>
                  </p>
                  <Link
                    href="/list-your-business"
                    className="mt-5 inline-flex h-11 items-center justify-center rounded-full bg-white px-5 text-sm font-extrabold text-[#35117e] transition hover:bg-[#f4efff]"
                  >
                    List my business →
                  </Link>
                </div>
              </div>
            </div>

            <div className="relative mx-auto w-full max-w-[650px] lg:max-w-none">
              <div className="relative aspect-[1.04/1] overflow-hidden rounded-[34px] bg-[#eee8f9] shadow-[0_24px_60px_rgba(38,19,89,0.13)]">
                <Image
                  src={AUCKLAND_IMAGE}
                  alt="Auckland CBD skyline and Sky Tower viewed across Waitematā Harbour"
                  fill
                  priority
                  sizes="(max-width: 1024px) 100vw, 55vw"
                  className="object-cover object-[52%_50%]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#21114b]/20 via-transparent to-transparent" />

                <div className="absolute left-5 top-5 rounded-full bg-white/95 px-4 py-2 text-xs font-extrabold uppercase tracking-[0.14em] text-[#35117e] shadow-sm sm:text-sm">
                  Auckland • launching first
                </div>

                <div className="absolute bottom-5 left-5 max-w-[320px] rounded-[16px] bg-[#21114b]/90 px-4 py-3 text-white backdrop-blur-sm">
                  <p className="text-sm font-extrabold sm:text-base">Same city. More to discover.</p>
                  <p className="mt-0.5 text-xs text-[#ddd4f5] sm:text-sm">Local offers from businesses around Auckland.</p>
                </div>

                <div className="absolute bottom-5 right-5 z-20 flex h-24 w-24 items-center justify-center rounded-full bg-white shadow-xl sm:h-28 sm:w-28">
                  <ElephantMascot className="scale-[2.05] sm:scale-[2.35]" />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 grid overflow-hidden rounded-[18px] border border-[#e9e3f1] bg-[#fbfaff] sm:grid-cols-2 lg:grid-cols-4">
            <div className="flex min-h-[92px] items-center gap-3 px-5 py-4 lg:border-r lg:border-[#e3ddec]">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#e5f8f0] text-[#0f9b67]">
                <LeafIcon className="h-5 w-5" />
              </span>
              <span className="text-sm font-bold leading-5 text-[#372d5e]">No vouchers to buy</span>
            </div>
            <div className="flex min-h-[92px] items-center gap-3 border-t border-[#e3ddec] px-5 py-4 sm:border-t-0 lg:border-r">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#eee7ff] text-[#5d25d9]">
                <StoreIcon className="h-5 w-5" />
              </span>
              <span className="text-sm font-bold leading-5 text-[#372d5e]">Deal directly with local businesses</span>
            </div>
            <div className="flex min-h-[92px] items-center gap-3 border-t border-[#e3ddec] px-5 py-4 sm:border-t lg:border-r lg:border-t-0">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#e5f8f0] text-[#0f9b67]">
                <UsersIcon className="h-5 w-5" />
              </span>
              <span className="text-sm font-bold leading-5 text-[#372d5e]">Support businesses in your city</span>
            </div>
            <div className="flex min-h-[92px] items-center gap-3 border-t border-[#e3ddec] px-5 py-4 lg:border-t-0">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#eee7ff] text-[#5d25d9]">
                <MapPinIcon className="h-5 w-5" />
              </span>
              <span className="text-sm font-bold leading-5 text-[#372d5e]">
                <strong className="block text-[#30107d]">Auckland first</strong>
                Wellington, Christchurch, Queenstown &amp; Hamilton next
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="px-5 py-5 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-[1180px] rounded-[22px] bg-[#35117e] px-5 py-7 text-white sm:px-8 lg:px-9">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <h2 className={`${fredoka.className} text-[30px] font-bold tracking-[-0.03em] text-white sm:text-[38px]`}>
              How MegaDeal will work
            </h2>
            <p className="text-sm font-semibold text-[#cdbdf5]">Simple. Direct. Local.</p>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            {[
              ["1", SearchIcon, "Find a deal", "Browse offers from local Auckland businesses."],
              ["2", TicketIcon, "Get the deal code", "No payment or voucher purchase required."],
              ["3", PhoneIcon, "Book direct & enjoy", "Contact the business, quote your code and pay them directly."],
            ].map(([number, Icon, title, copy]) => {
              const StepIcon = Icon as typeof SearchIcon;
              return (
                <div key={String(title)} className="grid grid-cols-[42px_52px_1fr] items-center gap-3 rounded-[16px] bg-white/8 p-4 ring-1 ring-white/10">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#ef159c] text-sm font-extrabold text-white">{number as string}</span>
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-white text-[#35117e]">
                    <StepIcon className="h-6 w-6" />
                  </span>
                  <div>
                    <h3 className="font-extrabold text-white">{title as string}</h3>
                    <p className="mt-1 text-sm leading-5 text-[#ddd4f5]">{copy as string}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="px-5 py-7 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-[1180px]">
          <h2 className={`${fredoka.className} text-[30px] font-bold tracking-[-0.03em] text-[#30107d] sm:text-[38px]`}>
            Deals across more of what you love
          </h2>
          <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {categories.map((category) => {
              const Icon = category.icon;
              return (
                <div key={category.label}>
                  <div className="relative aspect-[1.3/1] overflow-hidden rounded-[14px] bg-slate-100 shadow-sm">
                    <Image
                      src={category.image}
                      alt={`Generic ${category.label.toLowerCase()} category image`}
                      fill
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 16vw"
                      className="object-cover"
                    />
                    <span className="absolute bottom-2 left-2 flex h-8 w-8 items-center justify-center rounded-lg bg-white text-[#4f1fc5] shadow-sm">
                      <Icon className="h-4 w-4" />
                    </span>
                  </div>
                  <p className="mt-2.5 text-sm font-extrabold leading-4 text-[#30107d]">{category.label}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section id="get-notified" className="scroll-mt-24 px-5 py-5 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-[1180px] rounded-[20px] border border-[#e6e0ef] bg-[#f7f5fb] px-5 py-7 sm:px-8 lg:grid lg:grid-cols-[1fr_0.42fr] lg:items-center lg:gap-10 lg:px-9">
          <div>
            <h2 className={`${fredoka.className} text-[30px] font-bold tracking-[-0.03em] text-[#30107d] sm:text-[36px]`}>
              Be the first to know
            </h2>
            <p className="mt-1.5 max-w-3xl text-sm leading-6 text-[#544c6c] sm:text-base">
              Sign up and we&apos;ll let you know when we launch in Auckland, plus early access to special offers.
            </p>
            <div className="mt-4 max-w-3xl">
              <EmailSignupForm audience="customer" source="coming-soon" buttonLabel="Keep me posted →" accent="brand" surface="plain" />
              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs font-semibold text-[#675e80]">
                <span>✓ Free to join</span>
                <span>✓ No spam</span>
                <span>✓ Unsubscribe anytime</span>
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-[16px] bg-white p-5 ring-1 ring-[#e2dbea] lg:mt-0">
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#7057a5]">Launch order</p>
            <p className={`${fredoka.className} mt-2 text-2xl font-bold leading-tight text-[#30107d]`}>
              Auckland first.
              <br />
              New Zealand next.
            </p>
            <p className="mt-2 text-sm leading-5 text-[#625979]">We&apos;re starting focused, then expanding city by city.</p>
          </div>
        </div>
      </section>

      <section className="px-5 pb-8 pt-4 sm:px-8 lg:px-10">
        <div className="mx-auto grid max-w-[1180px] gap-5 lg:grid-cols-[1.55fr_0.95fr]">
          <div className="rounded-[22px] bg-[#35117e] p-5 text-white shadow-[0_18px_45px_rgba(53,17,126,0.20)] sm:p-8 lg:p-9">
            <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-[#ff77c2]">For Auckland businesses</p>
            <h2 className={`${fredoka.className} mt-2 text-[40px] font-bold leading-[0.96] tracking-[-0.035em] text-white sm:text-[50px]`}>
              Fill quiet times.
              <br />
              Get more customers.
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#ded5f5] sm:text-base">
              Turn empty tables, unused appointments, spare capacity and quiet periods into revenue. Join MegaDeal before launch and receive:
            </p>

            <div className="mt-6 grid gap-5 lg:grid-cols-[0.92fr_1.08fr] lg:items-start">
              <div className="rounded-[18px] bg-white/10 p-5 ring-1 ring-white/12">
                <div className="flex items-center gap-4">
                  <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-white text-[#35117e]">
                    <MegaphoneIcon className="h-8 w-8" />
                  </span>
                  <div>
                    <p className="text-sm font-extrabold text-[#d8cff1]">Up to</p>
                    <p className={`${fredoka.className} text-[40px] font-bold leading-none text-[#ff4eb2]`}>6 months</p>
                    <p className={`${fredoka.className} mt-1 text-[25px] font-bold leading-none text-white`}>advertising free.*</p>
                  </div>
                </div>
              </div>

              <ul className="grid gap-2.5 pt-1">
                {businessBenefits.map((benefit) => (
                  <li key={benefit} className="flex items-start gap-2.5 text-sm font-semibold leading-5 text-[#efe9fb]">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white text-[#35117e]">
                      <CheckIcon className="h-3.5 w-3.5" />
                    </span>
                    {benefit}
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                href="/list-your-business"
                className="inline-flex h-12 items-center justify-center rounded-full bg-[#ef159c] px-7 text-sm font-extrabold text-white transition hover:bg-[#d90f8b]"
              >
                List my business →
              </Link>
              <span className="text-sm font-semibold text-[#ded5f5]">
                Use code <strong className="font-extrabold text-white underline decoration-[#ff77c2] decoration-2 underline-offset-4">WELCOME6</strong>
              </span>
            </div>
            <p className="mt-3 text-[11px] leading-4 text-[#cfc3ec]">
              *T&amp;Cs apply. Limited-time offer for eligible new business listings. <Link href="/terms" className="underline hover:text-white">See terms</Link>.
            </p>
          </div>

          <div className="relative overflow-hidden rounded-[22px] border border-[#e6e0ef] bg-[#f7f5fb] p-5 sm:p-7 lg:p-8">
            <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-[#5d25d9]">Our launch plan</p>
            <div className="mt-6 grid gap-0">
              {rollout.map(([city, status], index) => (
                <div key={city} className="grid grid-cols-[22px_1fr] gap-3">
                  <div className="relative flex justify-center">
                    <span className={`relative z-10 mt-1 h-3.5 w-3.5 rounded-full border-[3px] ${index === 0 ? "border-[#ef159c] bg-white" : "border-[#aaa3b8] bg-[#aaa3b8]"}`} />
                    {index < rollout.length - 1 && <span className="absolute top-4 h-full w-px bg-[#d2ccd9]" />}
                  </div>
                  <div className="pb-4">
                    <p className={`font-extrabold ${index === 0 ? "text-[#30107d]" : "text-[#5f5870]"}`}>{city}</p>
                    <p className={`text-xs font-semibold ${index === 0 ? "text-[#ef159c]" : "text-[#868091]"}`}>{status}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 rounded-[15px] bg-white p-4 ring-1 ring-[#e2dbea]">
              <p className="text-sm font-extrabold text-[#30107d]">Focused launch, then steady expansion.</p>
              <p className="mt-1 text-xs leading-5 text-[#6b637b]">Auckland first, followed by Wellington, Christchurch, Queenstown and Hamilton.</p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
