import Image from "next/image";
import Link from "next/link";
import EmailSignupForm from "@/components/EmailSignupForm";
import { CreditCardIcon, SearchIcon, TagIcon } from "@/components/icons";
import { V2_CATEGORIES, V2_EXAMPLE_PHOTO, V2_FAQS, V2_HERO, V2_SOCIALS } from "@/lib/comingSoonV2Content";

// Plain paths, as elsewhere on the site: CI typechecks before Next has
// generated its image module types, so static image imports fail there.
const MASCOT = "/megadeal/coming-soon-v2/mascot-hoodie.webp";
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
        <section className={styles.hero} aria-labelledby="coming-soon-heading">
          <div className={styles.intro}>
            <h1 id="coming-soon-heading">
              Great local deals.
              <br />
              Coming soon.
            </h1>
            <p>Launching first in Auckland, with more NZ cities to follow.</p>
          </div>
          <div className={styles.art}>
            <div className={styles.skyline}>
              <Image
                src={V2_HERO.src}
                alt={V2_HERO.alt}
                fill
                priority
                sizes="(max-width: 767px) calc(100vw - 40px), (max-width: 1239px) 46vw, 560px"
                style={{ objectFit: "cover", objectPosition: V2_HERO.position }}
              />
            </div>
            <Image
              className={styles.mascot}
              src={MASCOT}
              alt=""
              width={480}
              height={496}
              sizes="(max-width: 767px) 110px, 190px"
            />
          </div>
          <div className={styles.conversion}>
            <h2>Be first to hear</h2>
            <div className={styles.signup}>
              <EmailSignupForm
                audience="customer"
                source="coming-soon"
                placeholder="Email address"
                buttonLabel="Notify me"
                surface="plain"
                shape="rounded"
              />
            </div>
            <nav className={styles.socials} aria-label="Follow MegaDeal">
              <span>Follow us:</span>
              <a href={V2_SOCIALS.instagram}>Instagram</a>
              <a href={V2_SOCIALS.facebook}>Facebook</a>
              <a href={V2_SOCIALS.tiktok}>TikTok</a>
            </nav>
          </div>
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
          <figure className={styles.example}>
            <figcaption>Example deal — not available to redeem</figcaption>
            <div className={styles.exampleCard}>
              <div className={styles.examplePhoto}>
                <Image
                  src={V2_EXAMPLE_PHOTO.src}
                  alt={V2_EXAMPLE_PHOTO.alt}
                  fill
                  loading="lazy"
                  sizes="(max-width: 767px) calc(100vw - 72px), 300px"
                  style={{ objectFit: "cover" }}
                />
              </div>
              <div className={styles.exampleText}>
                <h3>60-minute relaxation massage</h3>
                <p>Your business · Auckland</p>
                <strong>$49</strong>
                <p>Example price</p>
              </div>
            </div>
          </figure>
        </section>

        <section className={styles.business} aria-labelledby="business-heading">
          <div>
            <p className={styles.eyebrow}>For local businesses</p>
            <h2 id="business-heading">Fill quiet times. Reach more local customers.</h2>
            <p>You choose the offer. Customers book or buy directly from you.</p>
            <ul>
              <li>Up to 6 months free advertising*</li>
              <li>0% commission</li>
              <li>No lock-in</li>
            </ul>
          </div>
          <div>
            <Link className={styles.button} href="/list-your-business">
              List your business <span aria-hidden="true">→</span>
            </Link>
            <p className={styles.fine}>
              After your free period: pay-as-you-go credits.
              <br />
              *For eligible businesses that join before launch. <Link href="/terms">Terms</Link> apply.
            </p>
          </div>
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
