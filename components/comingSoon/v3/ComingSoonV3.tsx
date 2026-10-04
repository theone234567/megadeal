import Link from "next/link";
import EmailSignupForm from "@/components/EmailSignupForm";
import {
  ArrowRightIcon,
  CalendarIcon,
  CheckIcon,
  CompassIcon,
  FlowerIcon,
  HeartIcon,
  MapPinIcon,
  SearchIcon,
  StoreIcon,
  SuitcaseIcon,
  TagIcon,
  TicketIcon,
  UsersIcon,
  UtensilsIcon,
  WrenchIcon,
} from "@/components/icons";
import ScrollToSignupLink from "./ScrollToSignupLink";
import styles from "./ComingSoonV3.module.css";
// Preview only: hides the shared header's darker bottom border on this
// page, so the purple header and hero meet without a seam. Scoped to pages
// that render this component (see the file).
import "./coming-soon-v3-global.css";

/**
 * Coming-soon page, V3 design (owner's "Coming Soon Claude Pack", 4 Oct
 * 2026): purple header and hero, pink customer actions, purple business
 * actions. Admin preview only for now, at /coming-soon?design=v3; the
 * public page is unchanged.
 *
 * Header and footer are the site's own (root layout). The email form is
 * the real one (same endpoint, consent, double opt-in); business buttons
 * go to the real signup page. Photos are the pack's AI-generated
 * illustrations, served as resized WebP from public/megadeal-coming-soon/v3.
 *
 * Copy follows the pack, with corrections where it didn't match how
 * MegaDeal works or the owner's earlier decisions (no "free to join" or
 * "early access"; deal codes are per deal, not unique per person; not
 * every deal needs booking; the site's own category names).
 */

const IMG = "/megadeal-coming-soon/v3";
const MASCOT = "/images/home-car-business/mascot-welcome-current-480.webp";
const SIGNUP_ID = "launch-updates";
const TERMS_HREF = "/terms#businesses";

const BENEFITS = [
  { Icon: TicketIcon, text: "No vouchers to buy" },
  { Icon: UsersIcon, text: "Deal directly with local businesses" },
  { Icon: HeartIcon, text: "Support businesses in your city" },
  { Icon: MapPinIcon, text: "Launching first in Auckland" },
];

const STEPS = [
  { Icon: SearchIcon, title: "Find a deal", text: "Browse local offers across Auckland." },
  { Icon: TagIcon, title: "Get the deal code", text: "Open the deal and follow its instructions." },
  { Icon: CalendarIcon, title: "Book or visit & enjoy", text: "Use the code with the business and pay them directly." },
];

const CATEGORIES = [
  { Icon: UtensilsIcon, label: "Food & Drink", file: "food-drink", alt: "A burger and fries on a restaurant table" },
  { Icon: FlowerIcon, label: "Beauty & Spa", file: "beauty-spa", alt: "Rolled towels and candles in a day spa" },
  { Icon: CompassIcon, label: "Things To Do", file: "things-to-do", alt: "People kayaking on calm water" },
  { Icon: SuitcaseIcon, label: "Travel & Getaways", file: "getaways-stays", alt: "A bright hotel room ready for guests" },
  { Icon: WrenchIcon, label: "Home & Car", file: "home-auto", alt: "A mechanic working on a car" },
];

const CITIES = ["Auckland", "Wellington", "Christchurch", "Queenstown", "Hamilton"];

const BUSINESS_POINTS = [
  "0% commission on every sale",
  "Up to 6 months advertising free*",
  "Customers deal directly with you",
  "A simple way to fill quieter periods",
];

export default function ComingSoonV3() {
  return (
    <div className={styles.page} data-coming-soon="v3">
      {/* Purple hero, continuous with the purple header above it. */}
      <section className={styles.hero} aria-labelledby="cs3-title">
        <div className={styles.heroInner}>
          <div className={styles.heroCopy}>
            <p className={styles.pill}>Launching first in Auckland</p>
            <h1 id="cs3-title">Big local deals are on the way, Auckland.</h1>
            <p className={styles.lede}>
              MegaDeal is getting ready to launch in Auckland — helping local businesses fill quiet
              times and helping deal hunters discover standout local offers.
            </p>
            <p className={styles.offer}>
              0% commission for businesses • Up to 6 months advertising free
              <Link href={TERMS_HREF} className={styles.offerStar} aria-label="Terms apply to the free advertising offer">
                *
              </Link>
            </p>
          </div>
          {/* Photo and mascot are separate layers so each can be sized
              and placed per screen size. The Sky Tower is in the photo's
              left third, so the mascot stands on the right. */}
          <div className={styles.visual}>
            <div className={styles.photoFrame}>
              <img
                className={styles.photo}
                src={`${IMG}/hero-auckland-960-v1.webp`}
                srcSet={`${IMG}/hero-auckland-640-v1.webp 640w, ${IMG}/hero-auckland-960-v1.webp 960w, ${IMG}/hero-auckland-1280-v1.webp 1280w`}
                sizes="(max-width: 767px) 290px, (max-width: 1099px) 46vw, 560px"
                width={1536}
                height={1024}
                alt="Auckland city skyline and Sky Tower across the harbour"
                fetchPriority="high"
              />
            </div>
            <img className={styles.mascot} src={MASCOT} width={480} height={496} alt="" />
          </div>
        </div>
      </section>

      <div className={styles.main}>
        {/* Two audience cards, overlapping the hero's lower edge. */}
        <div className={styles.cards}>
          <section className={`${styles.card} ${styles.customerCard}`} aria-labelledby="cs3-customer">
            <span className={styles.cardIcon} aria-hidden="true">
              <TagIcon />
            </span>
            <div className={styles.cardBody}>
              <h2 id="cs3-customer">Love a great deal?</h2>
              <p>Get launch updates and be first to hear about local offers when MegaDeal launches in Auckland.</p>
              <ScrollToSignupLink targetId={SIGNUP_ID} className={`${styles.button} ${styles.pink}`}>
                Get launch updates <ArrowRightIcon className={styles.arrow} />
              </ScrollToSignupLink>
            </div>
          </section>
          <section className={`${styles.card} ${styles.businessCard}`} aria-labelledby="cs3-business">
            <span className={styles.cardIcon} aria-hidden="true">
              <StoreIcon />
            </span>
            <div className={styles.cardBody}>
              <h2 id="cs3-business">Run a local business?</h2>
              <p>
                Join before launch to reach new customers, fill quieter periods and get up to 6 months
                advertising free with 0% commission.*
              </p>
              <Link href="/list-your-business" className={`${styles.button} ${styles.purple}`}>
                Claim my free advertising <ArrowRightIcon className={styles.arrow} />
              </Link>
            </div>
          </section>
        </div>

        <ul className={styles.benefits} aria-label="Why MegaDeal">
          {BENEFITS.map(({ Icon, text }) => (
            <li key={text}>
              <Icon className={styles.lineIcon} />
              <span>{text}</span>
            </li>
          ))}
        </ul>

        <section className={styles.section} aria-labelledby="cs3-how">
          <h2 id="cs3-how" className={styles.sectionTitle}>
            How MegaDeal works
          </h2>
          <p className={styles.sectionLede}>Simple. Local. Great value.</p>
          <ol className={styles.steps}>
            {STEPS.map(({ Icon, title, text }, i) => (
              <li key={title}>
                <span className={styles.stepNumber} aria-hidden="true">
                  {i + 1}
                </span>
                <span className={styles.stepIcon} aria-hidden="true">
                  <Icon />
                </span>
                <div>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className={styles.section} aria-labelledby="cs3-categories">
          <h2 id="cs3-categories" className={styles.sectionTitle}>
            Explore deal categories
          </h2>
          <p className={styles.sectionLede}>A taste of what&rsquo;s coming to Auckland.</p>
          {/* Informational before launch, not links: the category pages
              aren't public yet. */}
          <ul className={styles.categories}>
            {CATEGORIES.map(({ Icon, label, file, alt }) => (
              <li key={label}>
                <img
                  className={styles.categoryPhoto}
                  src={`${IMG}/category-${file}-400-v1.webp`}
                  srcSet={`${IMG}/category-${file}-400-v1.webp 400w, ${IMG}/category-${file}-640-v1.webp 640w`}
                  sizes="(max-width: 767px) 45vw, (max-width: 1099px) 30vw, 230px"
                  width={1536}
                  height={1024}
                  alt={alt}
                  loading="lazy"
                  decoding="async"
                />
                <span className={styles.categoryLabel}>
                  <Icon className={styles.categoryIcon} />
                  {label}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <div className={styles.signupRow}>
          <section id={SIGNUP_ID} className={styles.customerPanel} aria-labelledby="cs3-signup">
            <img className={styles.panelMascot} src={MASCOT} width={480} height={496} alt="" loading="lazy" />
            <div className={styles.panelBody}>
              <h2 id="cs3-signup">Be first in line for launch deals</h2>
              <p className={styles.panelLede}>Hear about the best local offers in Auckland as soon as we launch.</p>
              <EmailSignupForm
                audience="customer"
                source="coming-soon"
                label="Email address"
                placeholder="Your email address"
                buttonLabel="Get launch updates"
                accent="ember"
                surface="plain"
                shape="rounded"
                layout="stacked"
              />
              <p className={styles.small}>No spam. Just great deals.</p>
            </div>
          </section>

          <section className={styles.businessPanel} aria-labelledby="cs3-grow">
            <h2 id="cs3-grow">Fill quiet times. Grow local customers.</h2>
            <p className={styles.panelLede}>Join before launch and be part of something big in Auckland.</p>
            <ul className={styles.checks}>
              {BUSINESS_POINTS.map((t) => (
                <li key={t}>
                  <CheckIcon className={styles.check} />
                  {t}
                </li>
              ))}
            </ul>
            <Link href="/list-your-business" className={`${styles.button} ${styles.purple}`}>
              Claim my free advertising <ArrowRightIcon className={styles.arrow} />
            </Link>
          </section>
        </div>

        <section className={styles.launch} aria-labelledby="cs3-launch">
          <div className={styles.launchIntro}>
            <MapPinIcon className={styles.launchPin} />
            <div>
              <h2 id="cs3-launch">Our launch plan</h2>
              <p>Auckland first, then more Kiwi cities.</p>
            </div>
          </div>
          <ol className={styles.cities}>
            {CITIES.map((c, i) => (
              <li key={c} className={i === 0 ? styles.cityActive : undefined}>
                <span className={styles.cityDot} aria-hidden="true" />
                <strong>{c}</strong>
                <span>{i === 0 ? "First" : "Next"}</span>
              </li>
            ))}
          </ol>
        </section>

        <p className={styles.footnote}>
          *<Link href={TERMS_HREF}>Terms apply</Link> to the free advertising offer for eligible businesses.
        </p>
      </div>
    </div>
  );
}
