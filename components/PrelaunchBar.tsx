import Link from "next/link";
import { PRELAUNCH_PROMO } from "@/lib/promo";
import { ArrowRightIcon, MegaphoneIcon } from "./icons";

/**
 * The black strip under the header on the prelaunch homepage: the one
 * place that says the site is in prelaunch and businesses can advertise
 * free now. The hero carries the main offer and the business strip the
 * details, so this stays to one line (two on a phone).
 */
export default function PrelaunchBar() {
  return (
    <div className="bg-[#17131F] text-white">
      {/* Phone: the whole strip is the link. */}
      <Link
        href="/list-your-business"
        className="flex min-h-[48px] items-center gap-3 px-4 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white md:hidden"
      >
        <MegaphoneIcon className="h-5 w-5 shrink-0 text-white/90" />
        <span className="min-w-0 flex-1 text-[0.8125rem] leading-snug">
          <span className="block font-extrabold tracking-[0.08em]">PRELAUNCH · Auckland first</span>
          <span className="block text-white/85">Businesses can advertise free now</span>
        </span>
        <ArrowRightIcon className="h-4 w-4 shrink-0" />
      </Link>

      <div className="mx-auto hidden h-11 max-w-[1200px] items-center gap-4 px-6 md:flex lg:px-8">
        <MegaphoneIcon className="h-5 w-5 shrink-0 text-white/90" />
        <p className="min-w-0 flex-1 truncate text-sm">
          <span className="font-extrabold tracking-[0.08em]">PRELAUNCH</span>
          <span aria-hidden="true" className="mx-2 text-white/50">·</span>
          <span>Auckland businesses can advertise free now</span>
          <span className="hidden xl:inline">
            <span aria-hidden="true" className="mx-2 text-white/50">·</span>1 Everyday + 1 Flash Deal at a time
          </span>
          <span className="hidden lg:inline">
            <span aria-hidden="true" className="mx-2 text-white/50">·</span>Up to {PRELAUNCH_PROMO.months} months free from launch*
          </span>
        </p>
        <Link
          href="/list-your-business"
          className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full bg-white px-3.5 text-[0.8125rem] font-bold text-[#17131F] transition hover:bg-hp-lavender focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#17131F]"
        >
          Claim free advertising
          <ArrowRightIcon className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}
