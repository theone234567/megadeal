import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { SITE_URL, SITE_NAME } from "@/lib/siteConfig";
import { caveat, fredoka, plusJakartaSans } from "@/lib/fonts";
import EmailSignupForm from "@/components/EmailSignupForm";
import ElephantMascot from "@/components/ElephantMascot";
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

const businessBenefits = [
  "No commission on sales",
  "Customers deal directly with you",
  "You control your offer and availability",
  "Reach new local customers",
  "A simple, effective way to grow your business",
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
    <main className={`${plusJakartaSans.className} overflow-hidden bg-white text-[#2f176f]`}>
      <section className="px-5 pb-7 pt-3 sm:px-8 lg:px-10 lg:pb-9">
        <div className="mx-auto max-w-[1440px]">
          <div className="grid items-start gap-7 lg:grid-cols-[0.86fr_1.14fr] lg:gap-8">
            <div className="pt-3 lg:pt-6">
              <p className="text-xs font-extrabold uppercase tracking-[0.24em] text-[#ed1695] sm:text-sm">
                Coming soon
              </p>
              <h1
                className={`${fredoka.className} mt-3 max-w-[650px] text-[44px] font-bold leading-[0.96] tracking-[-0.045em] text-[#35117e] sm:text-[58px] lg:text-[67px]`}
              >
                Auckland, get ready for better days out.
              </h1>
              <div className="mt-3 h-1.5 w-40 -rotate-1 rounded-full bg-[#ff2ca7] sm:w-52" aria-hidden />
              <p className="mt-4 max-w-[650px] text-base font-semibold leading-6 text-[#2f2b70] sm:text-[18px] sm:leading-7">
                Local deals. Local businesses. Real value for Aucklanders.
                <span className="block font-medium text-[#35305f]">
                  MegaDeal is launching in Auckland first — with Wellington, Christchurch, Queenstown and Hamilton to follow.
                </span>
              </p>

              <div className="mt-6 grid gap-3.5 sm:grid-cols-2">
                <div className="flex min-h-[210px] flex-col rounded-[24px] bg-[#f8f4ff] p-5 sm:p-6">
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#eadcff] text-[#f11ca3]">
                    <HeartIcon className="h-6 w-6" />
                  </span>
                  <h2 className={`${fredoka.className} mt-3 text-2xl font-bold leading-tight text-[#35117e]`}>
                    Love a good deal?
                  </h2>
                  <p className="mt-2 flex-1 text-sm leading-5 text-[#3e3665]">
                    Be the first to know when we launch in Auckland and get early access to local offers.
                  </p>
                  <a
                    href="#get-notified"
                    className="mt-4 inline-flex items-center justify-center rounded-full bg-[#f3169d] px-5 py-3 text-sm font-extrabold text-white transition hover:bg-[#d90d89]"
                  >
                    Get launch updates →
                  </a>
                </div>

                <div className="flex min-h-[210px] flex-col rounded-[24px] bg-[#fff8f4] p-5 sm:p-6">
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#ffe0f3] text-[#e9159a]">
                    <StoreIcon className="h-6 w-6" />
                  </span>
                  <h2 className={`${fredoka.className} mt-3 text-2xl font-bold leading-tight text-[#35117e]`}>
                    Run a local business?
                  </h2>
                  <p className="mt-2 flex-1 text-sm leading-5 text-[#3e3665]">
                    Join before launch and reach new customers with{" "}
                    <strong className="font-extrabold text-[#35117e]">up to 6 months advertising free.*</strong>
                  </p>
                  <Link
                    href="/list-your-business"
                    className="mt-4 inline-flex items-center justify-center rounded-full bg-gradient-to-r from-[#6f1bf1] to-[#8f24ff] px-5 py-3 text-sm font-extrabold text-white transition hover:brightness-95"
                  >
                    List my business →
                  </Link>
                </div>
              </div>
            </div>

            <div className="relative mx-auto w-full max-w-[760px] lg:-mt-14 lg:pr-4">
              <div className="relative aspect-[1.1/1] overflow-hidden rounded-[46%_54%_50%_50%/40%_40%_60%_60%] bg-[#efe7ff]">
                <Image
                  src={AUCKLAND_IMAGE}
                  alt="Auckland CBD skyline and Sky Tower viewed across Waitematā Harbour"
                  fill
                  priority
                  sizes="(max-width: 1024px) 100vw, 56vw"
                  className="object-cover object-[51%_50%]"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#2b145d]/10" />
                <div className="absolute left-[31%] top-[11%] rotate-[-5deg] text-center text-[#35117e] sm:left-[34%] sm:top-[12%]">
                  <p className={`${caveat.className} text-3xl font-bold leading-[0.9] sm:text-4xl lg:text-[44px]`}>
                    Same city.
                    <br />
                    More to love.
                  </p>
                  <span className="mx-auto mt-1 block h-1 w-24 rotate-[-8deg] rounded-full bg-[#ff2ca7] sm:w-28" />
                </div>
              </div>

              <div className="absolute -bottom-1 right-1 hidden origin-bottom-right scale-[1.55] sm:block lg:right-2 lg:scale-[1.8]">
                <ElephantMascot className="drop-shadow-xl" />
              </div>
            </div>
          </div>

          <div className="mt-7 grid gap-y-4 border-t border-[#eee8f7] pt-5 sm:grid-cols-2 lg:grid-cols-4 lg:gap-x-0">
            <div className="flex items-center gap-3 lg:border-r lg:border-[#ddd6eb] lg:pr-6">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#e9fbf4] text-[#13a66f]">
                <LeafIcon className="h-5 w-5" />
              </span>
              <span className="text-sm font-semibold leading-5 text-[#3d3565]">No vouchers to buy</span>
            </div>
            <div className="flex items-center gap-3 lg:border-r lg:border-[#ddd6eb] lg:px-6">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#ffe9f5] text-[#f118a1]">
                <HeartIcon className="h-5 w-5" />
              </span>
              <span className="text-sm font-semibold leading-5 text-[#3d3565]">Support local businesses</span>
            </div>
            <div className="flex items-center gap-3 lg:border-r lg:border-[#ddd6eb] lg:px-6">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#eaf9f3] text-[#16a36c]">
                <UsersIcon className="h-5 w-5" />
              </span>
              <span className="text-sm font-semibold leading-5 text-[#3d3565]">A fairer way for local communities</span>
            </div>
            <div className="flex items-center gap-3 lg:pl-6">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#e9fbf4] text-[#13a66f]">
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
        <div className="mx-auto max-w-[1440px] rounded-[24px] bg-[#f7f1ff] px-5 py-6 sm:px-7 lg:px-8">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <h2 className={`${fredoka.className} text-3xl font-bold tracking-[-0.03em] text-[#35117e] sm:text-4xl`}>
              How MegaDeal will work
            </h2>
            <p className={`${caveat.className} hidden rotate-[-4deg] text-2xl font-bold text-[#5420cf] md:block`}>
              Local deals made easy.
            </p>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_auto_1fr_auto_1fr] lg:items-center">
            <div className="grid grid-cols-[44px_58px_1fr] items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#7424f2] text-sm font-extrabold text-white">1</span>
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-[#7022ee] shadow-sm">
                <SearchIcon className="h-8 w-8" />
              </span>
              <div>
                <h3 className="font-extrabold text-[#35117e]">Find a deal</h3>
                <p className="mt-1 text-sm leading-5 text-[#4a426b]">Browse offers from local Auckland businesses.</p>
              </div>
            </div>

            <span className="hidden text-3xl font-bold text-[#7b23f4] lg:block" aria-hidden>→</span>

            <div className="grid grid-cols-[44px_58px_1fr] items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#7424f2] text-sm font-extrabold text-white">2</span>
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-[#7022ee] shadow-sm">
                <TicketIcon className="h-8 w-8" />
              </span>
              <div>
                <h3 className="font-extrabold text-[#35117e]">Get the deal code</h3>
                <p className="mt-1 text-sm leading-5 text-[#4a426b]">No payment or voucher purchase required.</p>
              </div>
            </div>

            <span className="hidden text-3xl font-bold text-[#7b23f4] lg:block" aria-hidden>→</span>

            <div className="grid grid-cols-[44px_58px_1fr] items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#7424f2] text-sm font-extrabold text-white">3</span>
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-[#7022ee] shadow-sm">
                <PhoneIcon className="h-8 w-8" />
              </span>
              <div>
                <h3 className="font-extrabold text-[#35117e]">Book direct &amp; enjoy</h3>
                <p className="mt-1 text-sm leading-5 text-[#4a426b]">Contact the business, quote your code and pay them directly.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-5 py-6 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-[1440px]">
          <h2 className={`${fredoka.className} text-3xl font-bold tracking-[-0.03em] text-[#35117e] sm:text-4xl`}>
            Deals across more of what you love
          </h2>
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {categories.map((category) => {
              const Icon = category.icon;
              return (
                <div key={category.label}>
                  <div className="relative aspect-[1.28/1] overflow-hidden rounded-[16px] bg-slate-100">
                    <Image
                      src={category.image}
                      alt={`Generic ${category.label.toLowerCase()} category image`}
                      fill
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 16vw"
                      className="object-cover"
                    />
                    <span className="absolute -bottom-1 left-1/2 flex h-9 w-9 -translate-x-1/2 items-center justify-center rounded-full border-4 border-white bg-white text-[#7022ee] shadow-sm">
                      <Icon className="h-5 w-5" />
                    </span>
                  </div>
                  <p className="mt-2.5 text-center text-xs font-extrabold leading-4 text-[#35117e] sm:text-sm">
                    {category.label}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section id="get-notified" className="scroll-mt-24 px-5 py-4 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-[1440px] rounded-[24px] bg-[#f8f2ff] px-5 py-6 sm:px-7 lg:grid lg:grid-cols-[1fr_0.8fr] lg:items-center lg:gap-8 lg:px-8">
          <div>
            <h2 className={`${fredoka.className} text-3xl font-bold tracking-[-0.03em] text-[#35117e] sm:text-4xl`}>
              Be the first to know
            </h2>
            <p className="mt-1.5 max-w-3xl text-sm leading-6 text-[#4a426b] sm:text-base">
              Sign up and we&apos;ll let you know when we launch in Auckland, plus early access to special offers.
            </p>
            <div className="mt-4 max-w-3xl">
              <EmailSignupForm
                audience="customer"
                source="coming-soon"
                buttonLabel="Keep me posted →"
                accent="brand"
                surface="plain"
              />
              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs font-semibold text-[#675e80]">
                <span>✓ Free to join</span>
                <span>✓ No spam</span>
                <span>✓ Unsubscribe anytime</span>
              </div>
            </div>
          </div>

          <div className="relative mt-5 hidden min-h-[105px] lg:block" aria-hidden>
            <div className="absolute left-[8%] top-[25%] h-10 w-40 rounded-[50%] border-b-2 border-dashed border-[#7430ee]" />
            <div className="absolute left-[48%] top-[10%] rotate-[-12deg] text-[#6e22ea]">
              <span className="block text-5xl">✈</span>
            </div>
            <p className={`${caveat.className} absolute right-[2%] top-[14%] rotate-[-7deg] text-3xl font-bold leading-[0.9] text-[#3d1a9d]`}>
              Be part from
              <br />
              the beginning.
            </p>
          </div>
        </div>
      </section>

      <section className="px-5 pb-4 pt-2 sm:px-8 lg:px-10">
        <div className="mx-auto grid max-w-[1440px] gap-4 lg:grid-cols-[1.65fr_1fr]">
          <div className="rounded-[24px] bg-gradient-to-br from-[#fff4fb] via-[#fbf3ff] to-[#f6efff] p-5 sm:p-7 lg:p-8">
            <p className="text-xs font-extrabold uppercase tracking-[0.22em] text-[#ed1695]">For Auckland businesses</p>
            <h2 className={`${fredoka.className} mt-2 text-4xl font-bold leading-[0.95] tracking-[-0.035em] text-[#35117e] sm:text-5xl`}>
              Fill quiet times.
              <br />
              Get more customers.
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[#4a426b] sm:text-base">
              Turn empty tables, unused appointments, spare capacity and quiet periods into revenue.
              Join MegaDeal before launch and receive:
            </p>

            <div className="mt-5 grid gap-5 lg:grid-cols-[0.95fr_1.15fr] lg:items-start">
              <div className="rounded-[20px] bg-white p-5 shadow-[0_7px_30px_rgba(80,39,144,0.08)]">
                <div className="flex items-center gap-4">
                  <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#f0e5ff] text-[#6e1deb]">
                    <MegaphoneIcon className="h-8 w-8" />
                  </span>
                  <div>
                    <p className="text-sm font-extrabold text-[#4f3a87]">Up to</p>
                    <p className={`${fredoka.className} text-4xl font-bold leading-none text-[#ef159c] sm:text-5xl`}>6 months</p>
                    <p className={`${fredoka.className} mt-1 text-2xl font-bold leading-none text-[#35117e] sm:text-[28px]`}>
                      advertising free.*
                    </p>
                  </div>
                </div>
              </div>

              <ul className="grid gap-2.5 pt-1">
                {businessBenefits.map((benefit) => (
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
              <Link
                href="/list-your-business"
                className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-[#6e1ced] to-[#8925ff] px-7 py-3.5 text-sm font-extrabold text-white transition hover:brightness-95"
              >
                List my business →
              </Link>
              <span className="text-sm font-semibold text-[#4a426b]">
                Use code <strong className="font-extrabold text-[#5f14d8] underline decoration-[#e8199d] decoration-2 underline-offset-4">WELCOME6</strong>
              </span>
            </div>
            <p className="mt-3 text-[11px] leading-4 text-[#766f88]">
              *T&amp;Cs apply. Limited-time offer for eligible new business listings. <Link href="/terms" className="underline hover:text-[#35117e]">See terms</Link>.
            </p>
          </div>

          <div className="relative overflow-hidden rounded-[24px] bg-[#f8f3ff] p-5 sm:p-7 lg:p-8">
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
            <p className={`${caveat.className} absolute right-4 top-14 hidden max-w-[165px] rotate-[-7deg] text-right text-2xl font-bold leading-[0.95] text-[#3f1aa8] sm:block`}>
              More local deals across New Zealand coming soon.
            </p>
            <div className="absolute -bottom-10 right-7 hidden text-[72px] font-black tracking-[-0.1em] text-[#decaff] sm:block" aria-hidden>
              NZ
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
