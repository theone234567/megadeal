import { caveat, fredoka } from "@/lib/fonts";

/**
 * The founder's note to businesses, signed by Nick: the owner's own
 * wording, used on /list-your-business and in the business section of
 * /coming-soon, so the two pages can't drift apart.
 *
 * Pre-launch wording ("join early", "up to six months"): see
 * docs/LAUNCH-OFFER-CHECKLIST.md.
 */
export default function FounderNote({
  headingLevel = "h2",
  compact = false,
}: {
  /** "h3" where the note sits inside a section that already has an h2. */
  headingLevel?: "h2" | "h3";
  /** Smaller heading, for the note as a card inside a section. */
  compact?: boolean;
}) {
  const Heading = headingLevel;
  return (
    <>
      <Heading
        className={`${fredoka.className} font-bold text-slate-900 [text-wrap:balance] ${
          compact ? "text-xl sm:text-2xl" : "text-2xl sm:text-3xl"
        }`}
      >
        Auckland businesses, get in early
      </Heading>
      <p className={`mt-2 font-semibold text-brand-700 [text-wrap:balance] ${compact ? "text-base sm:text-lg" : "text-lg"}`}>
        Customers pay you directly. You keep every dollar.
      </p>
      <div className={`space-y-4 text-slate-600 ${compact ? "mt-4 text-[15px] leading-6" : "mt-5"}`}>
        <p>
          MegaDeal is proudly Kiwi-owned, and we&apos;re launching first in
          Auckland. Before we open to everyone, we&apos;re welcoming a limited
          number of local businesses to join early, so each one gets our full
          attention.
        </p>
        <p>
          Our mission is simple: help Aucklanders discover brilliant local
          deals, and help local businesses win new customers.
        </p>
        <p>
          Unlike other deal sites, we don&apos;t take a cut of your sales or
          handle your payments. We simply put your offers in front of local
          customers, and they deal with you directly.
        </p>
        <p>
          Businesses that join now get up to six months of free advertising,
          and your feedback will help shape the features we build from day
          one.
        </p>
        <p>Joining is free. No credit card, no lock-in, and 0% commission.</p>
        <p>We&apos;d love to have you on board.</p>
        <div className="pt-1">
          <p className={`${caveat.className} text-3xl leading-none text-brand-700`}>Nick</p>
          <p className="mt-1 text-sm text-slate-500">Founder, MegaDeal</p>
        </div>
      </div>
    </>
  );
}
