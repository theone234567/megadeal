import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { SITE_URL, SITE_NAME } from "@/lib/siteConfig";
import { caveat, fredoka, plusJakartaSans } from "@/lib/fonts";
import EmailSignupForm from "@/components/EmailSignupForm";
import {
  CheckIcon,
  CompassIcon,
  DumbbellIcon,
  FlowerIcon,
  HeartIcon,
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

export default function ComingSoonPage() {
  return (
    <main className={`${plusJakartaSans.className} overflow-x-hidden bg-white text-[#27135c]`}>
      <section className="px-5 pb-5 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-[1024px]">
          <div className="grid items-start gap-7 lg:grid-cols-[48%_52%] lg:gap-2">
            <div className="relative z-20 pt-5 lg:pt-8">
              <p className="text-xs font-extrabold uppercase tracking-[0.28em] text-[#f2199c] sm:text-sm">
                Coming soon
              </p>
              <h1
                className={`${fredoka.className} mt-3 max-w-[510px] text-[44px] font-bold leading-[0.98] tracking-[-0.045em] text-[#341184] sm:text-[54px] lg:text-[58px]`}
              >
                Auckland, get ready for better days out.
              </h1>
              <span className="mt-3 block h-1.5 w-44 -rotate-1 rounded-full bg-[#ff2ca7] sm:w-52" />

              <div className="mt-5 max-w-[520px] text-[15px] leading-6 text-[#2f2860] sm:text-[16px]">
                <p className="font-semibold">Local deals. Local businesses. Real value for Aucklanders.</p>
                <p className="mt-1">
                  MegaDeal is launching in Auckland first — with Wellington, Christchurch, Queenstown and Hamilton to follow.
                </p>
              </div>

              <div className="relative z-30 mt-6 grid gap-3.5 sm:grid-cols-2 lg:w-[560px]">
                <div className="flex min-h-[205px] flex-col rounded-[20px] bg-[#f6f0ff] p-5 shadow-[0_8px_24px_rgba(84,44,150,0.05)]">
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#eadcff] text-[#ef159c]">
                    <HeartIcon className="h-6 w-6" />
                  </span>
                  <h2 className={`${fredoka.className} mt-3 text-[25px] font-bold leading-[1.05] text-[#35117e]`}>
                    Love a good deal?
                  </h2>
                  <p className="mt-2 flex-1 text-sm leading-5 text-[#4c426d]">
                    Be the first to know when we launch in Auckland and get early access to amazing local offers.
                  </p>
                  <a
                    href="#get-notified"
                    className="mt-4 inline-flex h-11 items-center justify-center rounded-full bg-[#f3169d] px-5 text-sm font-extrabold text-white shadow-sm transition hover:bg-[#da0f8a]"
                  >
                    Get launch updates →
                  </a>
                </div>

                <div className="flex min-h-[205px] flex-col rounded-[20px] bg-[#fff8f3] p-5 shadow-[0_8px_24px_rgba(84,44,150,0.05)]">
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#ffe0f2] text-[#ef159c]">
                    <StoreIcon className="h-6 w-6" />
                  </span>
                  <h2 className={`${fredoka.className} mt-3 text-[25px] font-bold leading-[1.05] text-[#35117e]`}>
                    Run a local business?
                  </h2>
                  <p className="mt-2 flex-1 text-sm leading-5 text-[#4c426d]">
                    Join before launch and reach new customers with <strong className="font-extrabold text-[#35117e]">up to 6 months advertising free.*</strong>
                  </p>
                  <Link
                    href="/list-your-business"
                    className="mt-4 inline-flex h-11 items-center justify-center rounded-full bg-gradient-to-r from-[#6c1cf1] to-[#8f24ff] px-5 text-sm font-extrabold text-white shadow-sm transition hover:brightness-95"
                  >
                    List my business →
                  </Link>
                </div>
              </div>
            </div>

            <div className="relative mx-auto mt-2 w-full max-w-[560px] lg:-mt-20 lg:ml-[-4px] lg:max-w-none">
              <div className="relative aspect-[0.98/1] overflow-hidden rounded-[48%_52%_52%_48%/38%_42%_58%_62%] bg-[#efe7ff]">
                <Image
                  src={AUCKLAND_IMAGE}
                  alt="Auckland CBD skyline and Sky Tower viewed across Waitematā Harbour"
                  fill
                  priority
                  sizes="(max-width: 1024px) 100vw, 52vw"
                  className="object-cover object-[52%_50%]"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-[#f6c8e5]/5 via-transparent to-[#2d165e]/10" />
                <div className="absolute left-[34%] top-[11%] rotate-[-5deg] text-center text-[#35117e]">
                  <p className={`${caveat.className} text-3xl font-bold leading-[0.92] sm:text-4xl lg:text-[42px]`}>
                    Same city.
                    <br />
                    More to love.
                  </p>
                  <span className="mx-auto mt-1 block h-1 w-24 -rotate-6 rounded-full bg-[#ff2ca7] sm:w-28" />
                </div>
              </div>

              <div className="absolute -bottom-4 right-[-18px] hidden h-[132px] w-[150px] overflow-hidden rounded-[40%] bg-white/0 sm:block lg:h-[150px] lg:w-[170px]">
                <Image
                  src="/brand/megadeal-logo.webp"
                  alt="MegaDeal elephant mascot"
                  width={900}
                  height={192}
                  className="absolute right-[-58px] top-[2px] h-[118px] w-auto max-w-none object-contain lg:h-[136px]"
                />
              </div>

              <p className={`${caveat.className} absolute -bottom-1 right-[-3px] hidden rotate-[-7deg] text-right text-xl font-bold leading-[0.95] text-[#3f1a9f] sm:block lg:right-[-10px] lg:text-[23px]`}>
                Local deals from
                <br />
                local businesses.
                <br />
                For Auckland.
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-y-4 border-t border-[#eee8f7] pt-5 sm:grid-cols-2 lg:grid-cols-4 lg:gap-x-0">
            <div className="flex items-center gap-3 lg:border-r lg:border-[#ddd6eb] lg:pr-5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#e9fbf4] text-[#14a66f]">
                <LeafIcon className="h-5 w-5" />
              </span>
              <span className="text-sm font-semibold leading-5 text-[#3d3565]">No vouchers to buy</span>
            </div>
            <div className="flex items-center gap-3 lg:border-r lg:border-[#ddd6eb] lg:px-5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#ffe8f4] text-[#f118a1]">
                <HeartIcon className="h-5 w-5" />
              </span>
              <span className="text-sm font-semibold leading-5 text-[#3d3565]">Support local businesses</span>
            </div>
            <div className="flex items-center gap-3 lg:border-r lg:border-[#ddd6eb] lg:px-5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#eaf9f3] text-[#15a36b]">
                <UsersIcon className="h-5 w-5" />
              </span>
              <span className="text-sm font-semibold leading-5 text-[#3d3565]">A fairer way for local communities</span>
            </div>
            <div className="flex items-center gap-3 lg:pl-5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#e9fbf4] text-[#13a66f]">
                <MapPinIcon className="h-5 w-5" />
              </span>
              <span className="text-sm font-semibold leading-5 text-[#3d3565]">
                <strong className="block text-[#35117e]">Launching in Auckland first</strong>
                Then Wellington, Christchurch, Queenstown &amp; Hamilton
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="px-5 py-4 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-[1024px] rounded-[20px] bg-[#f6efff] px-5 py-6 sm:px-7 lg:px-8">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <h2 className={`${fredoka.className} text-[30px] font-bold tracking-[-0.03em] text-[#35117e] sm:text-[34px]`}>
              How MegaDeal will work
            </h2>
            <p className={`${caveat.className} hidden rotate-[-4deg] text-2xl font-bold text-[#5420cf] md:block`}>
              Local deals made easy.
            </p>
          </div>

          <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_auto_1fr_auto_1fr] lg:items-center">
            {[
              ["1", SearchIcon, "Find a deal", "Browse offers from local Auckland businesses."],
              ["2", TicketIcon, "Get the deal code", "No payment or voucher purchase required."],
              ["3", PhoneIcon, "Book direct & enjoy", "Contact the business, quote your code and pay them directly."],
            ].map(([number, Icon, title, copy], index) => {
              const StepIcon = Icon as typeof SearchIcon;
              return (
                <div key={String(title)} className="contents">
                  <div className="grid grid-cols-[40px_54px_1fr] items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#7424f2] text-sm font-extrabold text-white">{number as string}</span>
                    <span className="flex h-13 w-13 items-center justify-center rounded-full bg-white text-[#7022ee] shadow-sm">
                      <StepIcon className="h-7 w-7" />
                    </span>
                    <div>
                      <h3 className="font-extrabold text-[#35117e]">{title as string}</h3>
                      <p className="mt-1 text-sm leading-5 text-[#4a426b]">{copy as string}</p>
                    </div>
                  </div>
                  {index < 2 && <span className="hidden text-3xl font-bold text-[#7b23f4] lg:block" aria-hidden>→</span>}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="px-5 py-6 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-[1024px]">
          <h2 className={`${fredoka.className} text-[30px] font-bold tracking-[-0.03em] text-[#35117e] sm:text-[34px]`}>
            Deals across more of what you love
          </h2>
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {categories.map((category) => {
              const Icon = category.icon;
              return (
                <div key={category.label}>
                  <div className="relative aspect-[1.35/1] overflow-hidden rounded-[14px] bg-slate-100">
                    <Image
                      src={category.image}
                      alt={`Generic ${category.label.toLowerCase()} category image`}
                      fill
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 16vw"
                      className="object-cover"
                    />
                    <span className="absolute bottom-1 left-1/2 flex h-8 w-8 -translate-x-1/2 items-center justify-center rounded-full border-[3px] border-white bg-white text-[#7022ee] shadow-sm">
                      <Icon className="h-4 w-4" />
                    </span>
                  </div>
                  <p className="mt-2 text-center text-xs font-extrabold leading-4 text-[#35117e] sm:text-sm">
                    {category.label}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section id="get-notified" className="scroll-mt-24 px-5 py-4 sm:px-8 lg:px-10">
        <div className="mx-auto grid max-w-[1024px] gap-6 rounded-[20px] bg-[#f7f0ff] px-5 py-6 sm:px-7 lg:grid-cols-[1fr_0.38fr] lg:items-center lg:px-8">
          <div>
            <h2 className={`${fredoka.className} text-[30px] font-bold tracking-[-0.03em] text-[#35117e] sm:text-[34px]`}>
              Be the first to know
            </h2>
            <p className="mt-1.5 max-w-2xl text-sm leading-6 text-[#4a426b] sm:text-base">
              Sign up and we&apos;ll let you know when we launch in Auckland, plus early access to special offers.
            </p>
            <div className="mt-4 max-w-2xl">
              <EmailSignupForm audience="customer" source="coming-soon" buttonLabel="Keep me posted →" accent="brand" surface="plain" />
              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs font-semibold text-[#675e80]">
                <span>✓ Free to join</span>
                <span>✓ No spam</span>
                <span>✓ Unsubscribe anytime</span>
              </div>
            </div>
          </div>
          <div className="relative hidden min-h-[120px] lg:block" aria-hidden>
            <span className="absolute left-[8%] top-[58%] h-px w-40 border-t border-dashed border-[#7b23f4]" />
            <span className="absolute left-[45%] top-[16%] rotate-[-10deg] text-5xl text-[#7022ee]">✈</span>
            <p className={`${caveat.className} absolute right-[2%] top-[20%] rotate-[-8deg] text-right text-3xl font-bold leading-[0.9] text-[#3f1aa8]`}>
              Be part from
              <br />
              the beginning.
            </p>
          </div>
        </div>
      </section>

      <section className="px-5 pb-6 pt-3 sm:px-8 lg:px-10">
        <div className="mx-auto grid max-w-[1024px] gap-4 lg:grid-cols-[1.55fr_0.95fr]">
          <div className="rounded-[20px] bg-gradient-to-br from-[#fff4fb] via-[#fbf3ff] to-[#f6efff] p-5 sm:p-7">
            <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-[#ed1695]">For Auckland businesses</p>
            <h2 className={`${fredoka.className} mt-2 text-[38px] font-bold leading-[0.95] tracking-[-0.035em] text-[#35117e] sm:text-[46px]`}>
              Fill quiet times.
              <br />
              Get more customers.
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#4a426b] sm:text-base">
              Turn empty tables, spare capacity and quiet periods into revenue. Join MegaDeal before launch and receive:
            </p>

            <div className="mt-5 grid gap-5 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
              <div className="rounded-[18px] bg-white p-5 shadow-[0_7px_30px_rgba(80,39,144,0.08)]">
                <div className="flex items-center gap-4">
                  <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#f0e5ff] text-[#6e1deb]">
                    <MegaphoneIcon className="h-8 w-8" />
                  </span>
                  <div>
                    <p className="text-sm font-extrabold text-[#4f3a87]">Up to</p>
                    <p className={`${fredoka.className} text-[38px] font-bold leading-none text-[#ef159c]`}>6 months</p>
                    <p className={`${fredoka.className} mt-1 text-[24px] font-bold leading-none text-[#35117e]`}>advertising free.*</p>
                  </div>
                </div>
              </div>

              <ul className="grid gap-2.5 pt-1">
                {[
                  "No commission on sales",
                  "Customers deal directly with you",
                  "You control your offer and availability",
                  "Reach new local customers",
                  "A simple, effective way to grow your business",
                ].map((benefit) => (
                  <li key={benefit} className="flex items-start gap-2.5 text-sm font-semibold leading-5 text-[#3f3860]">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#e9ddff] text-[#6c1be8]">
                      <CheckIcon className="h-3.5 w-3.5" />
                    </span>
                    {benefit}
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link href="/list-your-business" className="inline-flex h-11 items-center justify-center rounded-full bg-gradient-to-r from-[#6e1ced] to-[#8925ff] px-7 text-sm font-extrabold text-white transition hover:brightness-95">
                List my business →
              </Link>
              <span className="text-sm font-semibold text-[#4a426b]">Use code <strong className="font-extrabold text-[#5f14d8] underline decoration-[#e8199d] decoration-2 underline-offset-4">WELCOME6</strong></span>
            </div>
            <p className="mt-3 text-[11px] leading-4 text-[#766f88]">*T&amp;Cs apply. Limited-time offer for eligible new business listings. <Link href="/terms" className="underline hover:text-[#35117e]">See terms</Link>.</p>
          </div>

          <div className="relative overflow-hidden rounded-[20px] bg-[#f8f3ff] p-5 sm:p-7">
            <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-[#6c1be8]">Our launch plan</p>
            <div className="mt-5 grid gap-0">
              {rollout.map(([city, status], index) => (
                <div key={city} className="grid grid-cols-[22px_1fr] gap-3">
                  <div className="relative flex justify-center">
                    <span className={`relative z-10 mt-1 h-3.5 w-3.5 rounded-full border-[3px] ${index === 0 ? "border-[#ed1695] bg-white" : "border-[#c2bbd2] bg-[#c2bbd2]"}`} />
                    {index < rollout.length - 1 && <span className="absolute top-4 h-full w-px bg-[#d3cde0]" />}
                  </div>
                  <div className="pb-4">
                    <p className={`font-extrabold ${index === 0 ? "text-[#35117e]" : "text-[#6e6682]"}`}>{city}</p>
                    <p className={`text-xs font-semibold ${index === 0 ? "text-[#ed1695]" : "text-[#8a8398]"}`}>{status}</p>
                  </div>
                </div>
              ))}
            </div>
            <p className={`${caveat.className} absolute right-4 top-16 hidden max-w-[150px] rotate-[-7deg] text-right text-[24px] font-bold leading-[0.95] text-[#3f1aa8] sm:block`}>
              More local deals across New Zealand coming soon.
            </p>
            <div className="absolute -bottom-8 right-7 hidden text-[58px] font-black tracking-[-0.1em] text-[#decaff] sm:block" aria-hidden>NZ</div>
          </div>
        </div>
      </section>
    </main>
  );
}
