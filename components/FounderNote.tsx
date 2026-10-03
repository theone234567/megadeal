import { caveat, fredoka } from "@/lib/fonts";

/**
 * The founder's note to businesses, signed by Nick: the owner's own
 * wording, on /list-your-business, right before the sign-up form. Kept to
 * that one page: /coming-soon sends business owners there, so having it
 * on both meant reading it twice.
 *
 * Pre-launch wording ("join early", "up to six months"): see
 * docs/LAUNCH-OFFER-CHECKLIST.md.
 */
export default function FounderNote() {
  return (
    <>
      <h2 className={`${fredoka.className} text-2xl font-bold text-slate-900 [text-wrap:balance] sm:text-3xl`}>
        Auckland businesses, get in early
      </h2>
      <p className="mt-2 text-lg font-semibold text-brand-700 [text-wrap:balance]">
        Customers pay you directly. You keep every dollar.
      </p>
      <div className="mt-5 space-y-4 text-slate-600">
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
          {/* Full name under the handwritten first name: a real,
              accountable person is what a business owner checks for. */}
          <p className="mt-1 text-sm text-slate-500">Nick White, Founder, MegaDeal</p>
        </div>
      </div>
    </>
  );
}
