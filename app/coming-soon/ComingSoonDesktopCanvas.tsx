"use client";

import Link from "next/link";
import { useState } from "react";
import EmailSignupForm from "@/components/EmailSignupForm";
import AucklandSkylineArt from "@/components/comingSoon/AucklandSkylineArt";
import {
  DumbbellIcon,
  FlowerIcon,
  MapPinIcon,
  PhoneIcon,
  SearchIcon,
  StoreIcon,
  SuitcaseIcon,
  TicketIcon,
  UtensilsIcon,
  WrenchIcon,
  UsersIcon,
} from "@/components/icons";

const categories = [
  {
    name: "Food & Drink",
    icon: UtensilsIcon,
    image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=720&q=72",
  },
  {
    name: "Beauty & Spa",
    icon: FlowerIcon,
    image: "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=720&q=72",
  },
  {
    name: "Things To Do",
    icon: TicketIcon,
    image: "https://images.unsplash.com/photo-1502680390469-be75c86b636f?auto=format&fit=crop&w=720&q=72",
  },
  {
    name: "Travel & Getaways",
    icon: SuitcaseIcon,
    image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=720&q=72",
  },
  {
    name: "Health & Fitness",
    icon: DumbbellIcon,
    image: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=720&q=72",
  },
  {
    name: "Home & Car",
    icon: WrenchIcon,
    image: "https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?auto=format&fit=crop&w=720&q=72",
  },
];

const shell = "mx-auto w-full max-w-[1480px] px-6 xl:px-10";

export default function ComingSoonDesktopCanvas() {
  const [showSignup, setShowSignup] = useState(false);

  return (
    <>
      <div className="hidden lg:block">
        <section className="relative overflow-hidden bg-[#650fc7] text-white">
          <div className={`${shell} grid min-h-[590px] grid-cols-[0.92fr_1.08fr] items-center gap-16 py-14`}>
            <div className="max-w-[640px]">
              <div className="inline-flex rounded-full bg-[#e81ea3] px-5 py-2 text-sm font-extrabold uppercase tracking-[0.18em] text-white shadow-sm">
                Launching first in Auckland
              </div>
              <h1 className="mt-5 font-display text-[70px] font-black leading-[0.92] tracking-[-0.045em] 2xl:text-[80px]">
                Big local deals are on the way, Auckland.
              </h1>
              <p className="mt-6 max-w-[610px] text-[18px] leading-8 text-white/95 2xl:text-[20px]">
                MegaDeal is getting ready to launch in Auckland — helping local businesses fill quiet times and helping deal hunters discover standout local offers.
              </p>
              <div className="mt-5 flex flex-wrap gap-x-4 gap-y-2 text-[17px] font-extrabold leading-7">
                <span>0% commission for businesses</span>
                <span className="text-white/50">•</span>
                <span>Up to 6 months advertising free*</span>
              </div>
            </div>

            <div className="relative mx-auto w-full max-w-[720px] pb-8 pr-7 pt-2">
              <div className="relative rotate-[1.5deg]">
                <div
                  className="relative aspect-[1.28/1] overflow-hidden border-[5px] border-white/80 bg-white/10 shadow-[0_30px_80px_rgba(27,5,72,.34)]"
                  style={{ clipPath: "polygon(7% 0, 100% 0, 94% 100%, 0 100%)", borderRadius: "38px" }}
                >
                  <AucklandSkylineArt
                    shape="fill"
                    className="h-full w-full -rotate-[1.5deg] scale-[1.08] object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#241044]/16 via-transparent to-transparent" />
                  <div className="absolute right-7 top-6 -rotate-[1.5deg] rounded-full bg-white px-5 py-2 text-sm font-extrabold uppercase tracking-[0.13em] text-[#650fc7] shadow-sm">
                    Auckland first
                  </div>
                  <div className="absolute bottom-6 left-8 -rotate-[1.5deg] max-w-[390px] rounded-[18px] bg-[#321373]/92 px-6 py-4 text-white shadow-lg backdrop-blur-sm">
                    <p className="font-display text-xl font-black">Same city. More to discover.</p>
                    <p className="mt-1 text-sm text-white/85">Local offers. Local businesses. Better value.</p>
                  </div>
                </div>
              </div>

              <img
                src="/brand/deal-hunter-elephant.svg"
                alt="MegaDeal deal-hunter elephant holding a magnifying glass and a big deals tag"
                width={360}
                height={280}
                className="pointer-events-none absolute -bottom-3 -right-8 z-30 w-[245px] select-none drop-shadow-[0_18px_24px_rgba(38,8,87,.28)] 2xl:w-[275px]"
                fetchPriority="high"
              />
            </div>
          </div>
        </section>

        <section className="relative z-20 -mt-7 px-6 xl:px-10">
          <div className="mx-auto grid w-full max-w-[1320px] grid-cols-2 gap-5">
            <article className="flex min-h-[190px] items-center gap-5 rounded-[24px] border border-[#eee7f6] bg-white p-7 shadow-[0_18px_42px_rgba(40,7,88,.14)]">
              <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[#ffe1f2] text-[#e81ea3]">
                <TicketIcon className="h-8 w-8" />
              </span>
              <div>
                <h2 className="font-display text-[29px] font-black leading-tight text-[#191333]">Love a great deal?</h2>
                <p className="mt-2 max-w-[500px] text-[15px] leading-6 text-slate-600">Join free to get early access to local offers when MegaDeal launches in Auckland.</p>
                <button
                  type="button"
                  onClick={() => setShowSignup(true)}
                  className="mt-4 inline-flex h-11 items-center rounded-full bg-[#e81ea3] px-6 text-sm font-extrabold text-white transition hover:bg-[#c7128a]"
                >
                  Get launch updates →
                </button>
              </div>
            </article>

            <article className="flex min-h-[190px] items-center gap-5 rounded-[24px] border border-[#eee7f6] bg-white p-7 shadow-[0_18px_42px_rgba(40,7,88,.14)]">
              <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[#eee2ff] text-[#650fc7]">
                <StoreIcon className="h-8 w-8" />
              </span>
              <div>
                <h2 className="font-display text-[29px] font-black leading-tight text-[#191333]">Run a local business?</h2>
                <p className="mt-2 max-w-[540px] text-[15px] leading-6 text-slate-600">Join before launch and reach new customers, fill quieter periods and get up to 6 months advertising free with 0% commission.*</p>
                <Link href="/list-your-business" className="mt-4 inline-flex h-11 items-center rounded-full bg-[#650fc7] px-6 text-sm font-extrabold text-white transition hover:bg-[#530fa1]">
                  Claim my free advertising →
                </Link>
              </div>
            </article>
          </div>
        </section>

        <section className="px-6 pt-6 xl:px-10">
          <div className="mx-auto grid w-full max-w-[1320px] grid-cols-4 overflow-hidden rounded-[18px] bg-[#f7f7fb] ring-1 ring-[#eceaf2]">
            {[
              [TicketIcon, "No vouchers to buy"],
              [StoreIcon, "Deal directly with local businesses"],
              [UsersIcon, "Support businesses in your city"],
              [MapPinIcon, "Auckland first • Wellington, Christchurch, Queenstown & Hamilton next"],
            ].map(([Icon, text], index) => {
              const I = Icon as typeof TicketIcon;
              return (
                <div key={String(text)} className={`flex min-h-[88px] items-center gap-3 px-6 py-4 ${index ? "border-l border-[#e4e1eb]" : ""}`}>
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-[#650fc7] shadow-sm"><I className="h-5 w-5" /></span>
                  <p className="text-sm font-bold leading-5 text-[#292243]">{text as string}</p>
                </div>
              );
            })}
          </div>
        </section>

        <section className="px-6 py-10 xl:px-10">
          <div className="mx-auto w-full max-w-[1320px] rounded-[26px] bg-[#4d0ca8] px-8 py-8 text-white shadow-[0_16px_40px_rgba(69,16,141,.12)]">
            <div className="flex items-end justify-between gap-6">
              <div>
                <h2 className="font-display text-[34px] font-black">How MegaDeal works</h2>
                <p className="mt-1 text-sm font-semibold text-white/70">Simple. Direct. Local.</p>
              </div>
              <p className="text-sm font-semibold italic text-white/75">Local deals made easy.</p>
            </div>
            <div className="mt-6 grid grid-cols-3 gap-4">
              {[
                ["1", SearchIcon, "Find a deal", "Browse offers from local Auckland businesses."],
                ["2", TicketIcon, "Get the deal code", "No payment or voucher purchase required."],
                ["3", PhoneIcon, "Book direct & enjoy", "Contact the business, quote your code and pay them directly."],
              ].map(([number, Icon, title, copy]) => {
                const I = Icon as typeof SearchIcon;
                return (
                  <div key={String(title)} className="flex min-h-[132px] items-center gap-4 rounded-[18px] border border-white/10 bg-white/5 p-5">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#e81ea3] text-sm font-extrabold">{number as string}</span>
                    <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-white text-[#650fc7]"><I className="h-7 w-7" /></span>
                    <div><h3 className="font-extrabold">{title as string}</h3><p className="mt-1 text-sm leading-5 text-white/70">{copy as string}</p></div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section id="categories" className="px-6 pb-10 xl:px-10">
          <div className="mx-auto w-full max-w-[1320px]">
            <div className="text-center">
              <h2 className="font-display text-[34px] font-black text-[#171128]">Explore deal categories</h2>
              <p className="mt-1 text-sm text-slate-500">A taste of what&apos;s coming to Auckland.</p>
            </div>
            <div className="mt-6 grid grid-cols-6 gap-4">
              {categories.map(({ name, icon: Icon, image }) => (
                <Link
                  key={name}
                  href={name === "Home & Car" ? "/coming-soon#categories" : `/category/${encodeURIComponent(name)}`}
                  className="group overflow-hidden rounded-[18px] border border-[#e9e6f0] bg-white shadow-[0_8px_22px_rgba(28,18,54,.08)] transition hover:-translate-y-1 hover:shadow-[0_14px_28px_rgba(28,18,54,.12)]"
                >
                  <div className="relative aspect-[1.35/1] overflow-hidden bg-[#f3effa]">
                    <img src={image} alt={`${name} deals`} className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]" loading="lazy" decoding="async" />
                    <span className="absolute bottom-3 left-3 flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#650fc7] shadow-md"><Icon className="h-5 w-5" /></span>
                  </div>
                  <div className="flex min-h-[58px] items-center justify-center px-3 py-3 text-center"><span className="text-sm font-extrabold leading-tight text-[#241a45] group-hover:text-[#650fc7]">{name}</span></div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="px-6 pb-9 xl:px-10">
          <div className="mx-auto grid w-full max-w-[1320px] grid-cols-2 items-stretch gap-6">
            <div className="min-h-[330px] rounded-[24px] bg-[#fff0f7] px-10 py-9">
              <h2 className="max-w-[520px] font-display text-[31px] font-black leading-[1.25] text-[#18122d]">Be first in line for launch deals</h2>
              <p className="mt-3 text-[15px] leading-6 text-slate-600">Get early access to the best local offers in Auckland.</p>
              <div className="mt-5 max-w-[560px]">
                <EmailSignupForm
                  audience="customer"
                  source="coming-soon-desktop-inline"
                  buttonLabel="Get launch updates →"
                  accent="ember"
                  surface="plain"
                  layout="row"
                />
              </div>
            </div>

            <div className="min-h-[330px] rounded-[24px] bg-[#f3edff] px-10 py-9">
              <h2 className="max-w-[550px] font-display text-[31px] font-black leading-[1.25] text-[#18122d]">Fill quiet times. Grow local customers.</h2>
              <p className="mt-3 text-[15px] leading-6 text-slate-600">Join before launch and be part of something big in Auckland.</p>
              <ul className="mt-6 grid grid-cols-2 gap-x-8 gap-y-5 text-[15px] font-semibold leading-6 text-[#18122d]">
                {[
                  "0% commission on every sale",
                  "Up to 6 months advertising free*",
                  "Customers deal directly with you",
                  "A simple way to fill quieter periods",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <span className="mt-[1px] shrink-0 font-black text-[#18122d]">✓</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <Link href="/list-your-business" className="mt-6 inline-flex h-12 items-center rounded-full bg-[#6d24dc] px-7 text-sm font-extrabold text-white transition hover:bg-[#530fa1]">
                Claim my free advertising →
              </Link>
            </div>
          </div>
        </section>

        <section className="px-6 pb-14 xl:px-10">
          <div className="mx-auto flex min-h-[120px] w-full max-w-[1320px] items-center justify-between gap-10 rounded-[22px] bg-[#f5f7fb] px-7 py-6 ring-1 ring-[#e5e8ef]">
            <div className="flex items-center gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#eee2ff] text-[#6d24dc]"><MapPinIcon className="h-6 w-6" /></span>
              <div>
                <h2 className="font-display text-[24px] font-black text-[#18122d]">Our launch plan</h2>
                <p className="mt-1 text-[15px] text-slate-500">Auckland first, then more Kiwi cities.</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-x-7 gap-y-3 text-[15px] font-extrabold text-[#1f1836]">
              <span className="text-[#e81ea3]">Auckland • first</span>
              <span>Wellington</span>
              <span>Christchurch</span>
              <span>Queenstown</span>
              <span>Hamilton</span>
            </div>
          </div>
        </section>
      </div>

      {showSignup && (
        <div
          className="fixed inset-0 z-[100] hidden items-center justify-center bg-[#241044]/60 p-6 backdrop-blur-sm lg:flex"
          role="dialog"
          aria-modal="true"
          aria-labelledby="launch-signup-title"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setShowSignup(false);
          }}
        >
          <div className="relative w-full max-w-[560px] rounded-[28px] bg-white p-8 shadow-[0_30px_100px_rgba(30,8,65,.35)]">
            <button
              type="button"
              onClick={() => setShowSignup(false)}
              aria-label="Close launch updates form"
              className="absolute right-5 top-4 text-3xl leading-none text-slate-400 hover:text-slate-700"
            >
              ×
            </button>
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#e81ea3]">Auckland launch</p>
            <h2 id="launch-signup-title" className="mt-2 font-display text-3xl font-black text-[#1a1230]">Be first in line for launch deals</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">Join free and we&apos;ll let you know when MegaDeal launches in Auckland.</p>
            <div className="mt-5">
              <EmailSignupForm audience="customer" source="coming-soon-desktop" buttonLabel="Get launch updates →" accent="ember" surface="plain" layout="stacked" />
            </div>
          </div>
        </div>
      )}
    </>
  );
}