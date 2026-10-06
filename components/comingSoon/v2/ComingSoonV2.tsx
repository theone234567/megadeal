import Image from "next/image";
import Link from "next/link";
import EmailSignupForm from "@/components/EmailSignupForm";
import { CreditCardIcon, SearchIcon, TagIcon } from "@/components/icons";
import { V2_CATEGORIES, V2_FAQS, V2_HERO, V2_SOCIALS } from "@/lib/comingSoonV2Content";
import DealCard from "@/components/DealCard";
import { EXAMPLE_MASSAGE_DEAL } from "@/lib/exampleDeals";

// Plain paths, as elsewhere on the site: CI typechecks before Next has
// generated its image module types, so static image imports fail there.
const MASCOT = "/megadeal/coming-soon-v2/mascot-hoodie.webp";
const HERO_SIZES = "(max-width: 767px) calc(100vw - 84px), (max-width: 1223px) 44vw, 506px";
import styles from "./ComingSoonV2.module.css";

/**
 * Coming-soon page, V2 design (Coming Soon pack, 3 Oct 2026). Shown only
 * when COMING_SOON_DESIGN is "v2" (lib/siteConfig.ts), or to a signed-in
 * admin at /coming-soon?design=v2; otherwise the existing page renders.
 *
 * Presentation only: the header and footer come from the root layout, the
 * email form is the site's real one (same endpoint, consent and double
 * opt-in), and nothing here creates an account, a deal or a credit. The
 * example deal is static and labelled as not redeemable: no countdown, no
 * code, no booking action, no Offer schema.
 */
export default function ComingSoonV2() {
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        {/* Hero: one heading, one line of introduction, one signup and the
            Auckland artwork. Text and signup left, artwork right (desktop);
            heading, introduction, artwork, signup (phone). */}
        <section className={styles.hero} aria-labelledby="coming-soon-heading">
          <div className={styles.intro}>
            <h1 id="coming-soon-heading">
              Great local deals.{" "}
              <span className={styles.accent}>Coming soon to Auckland.</span>
            </h1>
            <p>
              Food, experiences, beauty and more.
              <br />
              <span className={styles.launching}>Launching first in Auckland.</span>
            </p>
          </div>
          <div className={styles.art}>
            <div className={styles.skyline}>
              {/* A plain img with a choice of sizes: next/image can't offer
                  one while images aren't resized on the fly (next.config.mjs).
                  Fetched first, as the largest thing on the page. */}
              <link rel="preload" as="image" href={V2_HERO.src} imageSrcSet={V2_HERO.srcSet} imageSizes={HERO_SIZES} {...{ fetchPriority: "high" }} />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={V2_HERO.src}
                srcSet={V2_HERO.srcSet}
                sizes={HERO_SIZES}
                alt={V2_HERO.alt}
                {...{ fetchPriority: "high" }}
                decoding="async"
                style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: V2_HERO.position }}
              />
              {/* Small and decorative; the photo's edge hides his lower half. */}
              <Image className={styles.mascot} src={MASCOT} alt="" width={480} height={496} sizes="(max-width: 767px) 72px, 104px" />
            </div>
          </div>
          <div className={styles.conversion}>
            <div className={styles.signup}>
              <EmailSignupForm
                audience="customer"
                source="coming-soon"
                label="Get notified when we launch."
                placeholder="Email address"
                buttonLabel="Notify me"
                surface="plain"
                shape="rounded"
              />
            </div>
            <nav className={styles.socials} aria-label="Follow MegaDeal">
              <a href={V2_SOCIALS.instagram}>Instagram</a>
              <span aria-hidden="true">·</span>
              <a href={V2_SOCIALS.facebook}>Facebook</a>
              <span aria-hidden="true">·</span>
              <a href={V2_SOCIALS.tiktok}>TikTok</a>
            </nav>
          </div>
        </section>

        {/* The business invitation, outside the hero so the email signup
            stays the one main action. Outlined button for the same reason. */}
        <section className={styles.business} aria-labelledby="business-heading">
          <div>
            <h2 id="business-heading">Run a local business?</h2>
            <p className={styles.businessOffer}>Get up to 6 months free advertising.</p>
            <p className={styles.fine}>
              For eligible pre-launch businesses. <Link href="/terms#businesses">Terms apply.</Link>
            </p>
          </div>
          <Link className={styles.outlineButton} href="/list-your-business">
            Explore the business offer <span aria-hidden="true">→</span>
          </Link>
        </section>

        <ul className={styles.benefits} aria-label="How MegaDeal works for you">
          <li>
            <SearchIcon className={styles.benefitIcon} />
            <div>
              <strong>No account needed</strong>
              <span>Browse deals and get your code.</span>
            </div>
          </li>
          <li>
            <TagIcon className={styles.benefitIcon} />
            <div>
              <strong>No vouchers to buy</strong>
              <span>Follow the deal’s instructions.</span>
            </div>
          </li>
          <li>
            <CreditCardIcon className={styles.benefitIcon} />
            <div>
              <strong>Pay the business directly</strong>
              <span>Book online, call or visit.</span>
            </div>
          </li>
        </ul>

        <section className={styles.section} aria-labelledby="categories-heading">
          <h2 id="categories-heading">More to look forward to</h2>
          {/* Descriptive before launch, not links: the category pages
              aren't public yet. */}
          <ul className={styles.categories}>
            {V2_CATEGORIES.map((c) => (
              <li key={c.label}>
                <div className={styles.categoryPhoto}>
                  <Image
                    src={c.src}
                    alt={c.alt}
                    fill
                    loading="lazy"
                    sizes="(max-width: 767px) calc((100vw - 52px) / 2), (max-width: 1023px) 30vw, 190px"
                    style={{ objectFit: "cover" }}
                  />
                </div>
                <h3>{c.label}</h3>
              </li>
            ))}
          </ul>
        </section>

        <section className={`${styles.section} ${styles.explainer}`} aria-labelledby="how-heading">
          <div>
            <h2 id="how-heading">How it works</h2>
            <ol className={styles.steps}>
              <li>
                <h3>Find a deal</h3>
                <p>Discover an offer you love.</p>
              </li>
              <li>
                <h3>Get the code</h3>
                <p>Follow the deal’s instructions.</p>
              </li>
              <li>
                <h3>Enjoy it locally</h3>
                <p>Book or visit. Pay the business.</p>
              </li>
            </ol>
          </div>
          {/* No visible caption (owner's call, 4 Oct 2026): "Your
              business" on the card keeps it plainly an example. */}
          <figure className={styles.example}>
            {/* The real DealCard, as on the site, with example details
                (lib/exampleDeals.ts). Not a link; hidden from screen
                readers, which get the caption below instead. */}
            <figcaption className={styles.visuallyHidden}>Example deal</figcaption>
            <div aria-hidden className={styles.exampleDeal}>
              <DealCard deal={EXAMPLE_MASSAGE_DEAL} preview />
            </div>
          </figure>
        </section>


        <section className={styles.section} aria-labelledby="faq-heading">
          <h2 id="faq-heading">A few things to know</h2>
          <div className={styles.faq}>
            {V2_FAQS.map((f) => (
              <details key={f.question}>
                <summary>{f.question}</summary>
                <p>{f.answer}</p>
              </details>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
