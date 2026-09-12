"use client";

import Link from "next/link";
import { useState } from "react";
import EmailSignupForm from "@/components/EmailSignupForm";

export default function ComingSoonDesktopCanvas() {
  const [showSignup, setShowSignup] = useState(false);

  return (
    <>
      <section className="relative hidden bg-white lg:block" aria-label="MegaDeal Auckland launch page">
        <div className="relative mx-auto w-full max-w-[1500px]">
          <img
            src="/brand/coming-soon-approved-exact.webp"
            alt=""
            aria-hidden="true"
            width={1055}
            height={1422}
            className="block h-auto w-full select-none"
            draggable={false}
            fetchPriority="high"
          />

          <button
            type="button"
            aria-label="Get MegaDeal Auckland launch updates"
            onClick={() => setShowSignup(true)}
            className="absolute left-[16.8%] top-[34.0%] h-[3.35%] w-[30%] cursor-pointer rounded-full bg-transparent outline-none focus-visible:ring-4 focus-visible:ring-white/70"
          />

          <Link
            href="/list-your-business"
            aria-label="Claim my free advertising"
            className="absolute left-[63.4%] top-[34.25%] h-[3.35%] w-[30%] rounded-full outline-none focus-visible:ring-4 focus-visible:ring-white/70"
          />

          <button
            type="button"
            aria-label="Sign up for MegaDeal launch updates"
            onClick={() => setShowSignup(true)}
            className="absolute left-[39.2%] top-[79.7%] h-[3.2%] w-[16.5%] cursor-pointer rounded-full bg-transparent outline-none focus-visible:ring-4 focus-visible:ring-[#7a17f0]/40"
          />

          <Link
            href="/list-your-business"
            aria-label="Claim my free advertising for my business"
            className="absolute left-[61.8%] top-[84.1%] h-[3.0%] w-[22.5%] rounded-full outline-none focus-visible:ring-4 focus-visible:ring-[#7a17f0]/40"
          />
        </div>
      </section>

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
            <h2 id="launch-signup-title" className="mt-2 font-display text-3xl font-black text-[#1a1230]">
              Be first in line for launch deals
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Join free and we&apos;ll let you know when MegaDeal launches in Auckland.
            </p>
            <div className="mt-5">
              <EmailSignupForm
                audience="customer"
                source="coming-soon-desktop"
                buttonLabel="Get launch updates →"
                accent="ember"
                surface="plain"
                layout="stacked"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
