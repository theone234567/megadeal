import { ArrowRightIcon, HeartIcon, TagIcon, UsersIcon } from "./icons";

/**
 * The homepage hero: the M-shirt mascot and Auckland artwork, with the
 * headline and button as real HTML beside it — never baked into the image.
 *
 * Art-directed with <picture>, so a phone downloads only the compact
 * text-free adaptation and a desktop only the wide original. The wide art
 * has the mascot close to its left edge, so it's kept for 1024px and up,
 * where the text column is clear of it; tablets use the phone art.
 *
 * The artwork is decorative (empty alt): the headline says what matters.
 */
export default function Hero() {
  return (
    <section aria-labelledby="hero-heading" className="px-4 pt-4 sm:px-6 lg:px-8 lg:pt-5">
      <div className="relative mx-auto max-w-[1320px] overflow-hidden rounded-[22px] bg-gradient-to-r from-[#EEE7FB] via-[#F4F0FA] to-[#F4F0FA] lg:rounded-[28px]">
        <picture>
          <source media="(min-width: 1024px)" srcSet="/megadeal/hero-auckland-card.webp" width={1800} height={619} />
          <img
            src="/homepage/mobile-hero-artwork.webp"
            alt=""
            width={1200}
            height={526}
            fetchPriority="high"
            decoding="async"
            // On desktop the art's own pale left edge fades into the hero's
            // background, so there's no seam where the picture starts.
            className="absolute inset-0 h-full w-full select-none object-cover object-[28%_50%] lg:left-auto lg:w-auto lg:max-w-none lg:object-contain lg:[mask-image:linear-gradient(to_right,transparent,black_18%)]"
          />
        </picture>

        <div className="relative flex min-h-[170px] max-w-[58%] flex-col justify-center py-5 pl-5 pr-2 sm:min-h-[220px] sm:max-w-[52%] sm:pl-8 lg:min-h-[280px] lg:max-w-[46%] lg:py-8 lg:pl-12">
          <h1
            id="hero-heading"
            className="font-display text-[1.625rem] font-bold leading-[1.02] tracking-[-0.01em] text-hp-ink sm:text-[2.25rem] lg:text-[3.25rem]"
          >
            Big local deals.
            <br />
            <span className="text-hp-purple">More to enjoy.</span>
          </h1>
          <p className="mt-3 hidden text-base text-hp-ink sm:block lg:text-[1.0625rem]">
            Discover great offers from Auckland&apos;s local businesses.
          </p>
          <div className="mt-4 lg:mt-5">
            <a
              href="#deals"
              className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-hp-purple px-5 text-[0.9375rem] font-bold text-white shadow-sm transition hover:bg-hp-purple-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hp-purple focus-visible:ring-offset-2 lg:min-h-[48px] lg:px-6 lg:text-base"
            >
              Browse deals
              <ArrowRightIcon className="h-4 w-4" />
            </a>
          </div>
          <ul className="mt-5 hidden flex-wrap gap-x-7 gap-y-2 text-sm font-semibold text-hp-ink lg:flex">
            <li className="flex items-center gap-2">
              <TagIcon className="h-[18px] w-[18px] text-hp-purple" />
              Local businesses
            </li>
            <li className="flex items-center gap-2">
              <HeartIcon className="h-[18px] w-[18px] text-hp-purple" />
              Great value
            </li>
            <li className="flex items-center gap-2">
              <UsersIcon className="h-[18px] w-[18px] text-hp-purple" />
              Support local
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
}
