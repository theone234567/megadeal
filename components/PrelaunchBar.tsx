"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PRELAUNCH_PROMO } from "@/lib/promo";
import { MegaphoneIcon } from "./icons";

/**
 * The dark strip above the header on every public page before launch
 * (app/layout.tsx, with PRELAUNCH_HOME): says the site is in prelaunch and
 * what businesses get now. Information only: the purple header below,
 * which stays pinned, carries the "Advertise free" button, so the strip
 * doesn't repeat it. It scrolls away. Not in the business portal or admin,
 * which have their own screens.
 *
 * Its colour is the site's ink (hp-ink), a near-black with a purple tint:
 * clearly apart from the purple header, but of the same family.
 */
const HIDDEN = /^\/(?:portal|admin|coming-soon)(?:\/|$)/;

const Dot = () => (
  <span aria-hidden="true" className="mx-2 text-white/45">
    ·
  </span>
);

const Terms = () => (
  <Link href="/terms" prefetch={false} className="underline underline-offset-2 hover:text-white">
    T&amp;Cs apply
  </Link>
);

export default function PrelaunchBar() {
  const pathname = usePathname();
  if (pathname && HIDDEN.test(pathname)) return null;
  return (
    <aside aria-label="Prelaunch" className="bg-hp-ink text-white">
      {/* Phone: two short lines. */}
      <div className="flex items-center gap-3 px-4 py-2 md:hidden">
        <MegaphoneIcon className="h-5 w-5 shrink-0 text-white/90" />
        <p className="min-w-0 flex-1 text-[0.8125rem] leading-snug">
          <span className="block">
            <span className="font-extrabold tracking-[0.08em]">PRELAUNCH</span> · Advertise free now
          </span>
          <span className="block text-white/80">
            Up to {PRELAUNCH_PROMO.months} months free<span className="hidden min-[400px]:inline"> from launch</span> · <Terms />
          </span>
        </p>
      </div>

      <div className="mx-auto hidden h-10 max-w-[1200px] items-center gap-3 px-6 md:flex lg:px-8">
        <MegaphoneIcon className="h-5 w-5 shrink-0 text-white/90" />
        <p className="min-w-0 flex-1 truncate text-sm text-white/90">
          <span className="font-extrabold tracking-[0.08em] text-white">PRELAUNCH</span>
          <Dot />
          <span className="text-white">Auckland businesses can advertise free now</span>
          <span className="hidden xl:inline">
            <Dot />1 Everyday + 1 Flash Deal at a time
          </span>
          <span className="hidden lg:inline">
            <Dot />
            Up to {PRELAUNCH_PROMO.months} months free from launch
          </span>
          <span className="hidden lg:inline">
            <Dot />
            0% commission
          </span>
          <Dot />
          <Terms />
        </p>
      </div>
    </aside>
  );
}
