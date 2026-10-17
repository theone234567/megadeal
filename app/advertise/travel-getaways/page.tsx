import type { Metadata } from "next";
import IndustryAdvertisePage, { type IndustryPageContent } from "@/components/business/IndustryAdvertisePage";
import { CalendarIcon, ClockIcon, CompassIcon, HeartIcon, HomeIcon, LeafIcon, StoreIcon, SuitcaseIcon, UnlockIcon, UsersIcon } from "@/components/icons";
import { SITE_URL } from "@/lib/siteConfig";

/**
 * /advertise/travel-getaways: for Auckland accommodation and getaway
 * businesses (17 Oct 2026), so every customer category has its own
 * advertise page. Laid out by components/business/IndustryAdvertisePage.tsx.
 */

const PATH = "/advertise/travel-getaways";
const TITLE = "Accommodation & Getaway Advertising Auckland";
const DESCRIPTION =
  "Promote your Auckland hotel, motel, B&B, retreat or getaway package with MegaDeal. Reach local customers, pay 0% commission and get the launch offer.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: `${SITE_URL}${PATH}` },
  openGraph: { title: `${TITLE} | MegaDeal`, description: DESCRIPTION, url: `${SITE_URL}${PATH}`, type: "website" },
  twitter: { card: "summary_large_image", title: `${TITLE} | MegaDeal`, description: DESCRIPTION },
};

const CONTENT: IndustryPageContent = {
  path: PATH,
  trackingName: "advertise_travel_getaways",
  audience: "For Auckland accommodation & getaway businesses",
  headline: "Fill quieter nights.",
  headlineAccent: "Welcome more local getaways.",
  intro:
    "Put your rooms, stays and getaway packages in front of Aucklanders planning their next break. You choose the offer, nights and availability. Guests book and pay you directly.",
  heroPhoto: {
    src: "/megadeal-coming-soon/travel-getaways-v1.webp",
    alt: "A bright hotel bedroom with a coastal view",
    width: 800,
    height: 600,
  },
  typesNavLabel: "Accommodation & getaway business types",
  typesHeading: "Built for Travel & Getaways businesses.",
  typesIntro:
    "From city hotels to island retreats and glamping, create an offer around the nights and packages that make sense for your business.",
  types: [
    {
      id: "hotels-motels",
      title: "Hotels & Motels",
      icon: StoreIcon,
      body: "Promote selected weeknights or quieter dates to locals looking for a staycation or a night away close to home.",
      ideas: ["Weeknight stay", "Stay + breakfast", "Late checkout"],
    },
    {
      id: "bnb-boutique",
      title: "B&Bs & Boutique Stays",
      icon: HomeIcon,
      body: "Introduce new guests to your rooms with a simple package, while keeping your busiest weekends at their usual rate.",
      ideas: ["Midweek escape", "Two-night package", "Stay + extra"],
    },
    {
      id: "island-coastal",
      title: "Island & Coastal Retreats",
      icon: CompassIcon,
      body: "Give Aucklanders a reason to visit in the shoulder season, with clear dates and exactly what's included.",
      ideas: ["Off-peak getaway", "Sunday to Thursday stay", "Stay + dinner"],
    },
    {
      id: "glamping-holiday-parks",
      title: "Glamping & Holiday Parks",
      icon: LeafIcon,
      body: "Promote selected cabins, sites or tents on quieter nights, and spell out who and what each stay includes.",
      ideas: ["Weeknight glamping", "Family cabin", "Selected-date stay"],
    },
    {
      id: "lodges-country-stays",
      title: "Lodges & Country Stays",
      icon: HeartIcon,
      body: "Package a stay with something guests will remember, on the dates you'd genuinely like to fill.",
      ideas: ["Romantic escape", "Stay + experience", "Shoulder-season offer"],
    },
    {
      id: "staycation-packages",
      title: "Staycation Packages",
      icon: SuitcaseIcon,
      body: "Bundle a night with dinner, parking or a spa visit into one clear package for locals who don't want to travel far.",
      ideas: ["Dinner, bed & breakfast", "Anniversary stay", "Staycation package"],
    },
  ],
  value: {
    eyebrow: "Smarter local promotion",
    heading: "Turn quieter nights into new guests.",
    body: "An empty room can't be sold once the night has passed. MegaDeal gives Auckland accommodation businesses another way to promote selected nights while keeping control of their busiest dates.",
    cards: [
      { icon: CalendarIcon, title: "Fill Quieter Nights", body: "Use selected weeknights, shoulder-season dates or packages where you would genuinely like more guests." },
      { icon: UsersIcon, title: "Reach Local Travellers", body: "Get discovered by Aucklanders looking for a staycation or a getaway close to home." },
      { icon: ClockIcon, title: "Protect Your Peak Dates", body: "Promote selected availability rather than discounting every night or every room." },
      { icon: UnlockIcon, title: "Stay in Control", body: "You choose the offer, nights, booking requirements and conditions that suit your business." },
    ],
  },
  createStep: "Choose the stay or package, value, dates, availability and booking details.",
  bookStep: {
    title: "Guests Book Direct",
    body: "Guests discover your deal and book with your business. You confirm availability and take payment directly.",
  },
  faqs: [
    {
      q: "What types of accommodation and getaway businesses can join?",
      a: "MegaDeal is designed for eligible local hotels, motels, B&Bs, boutique stays, retreats, lodges, glamping sites, holiday parks and getaway packages. Your business and offers must meet the current eligibility requirements.",
    },
    {
      q: "Do I have to discount every night?",
      a: "No. Choose the rooms, nights or packages you want to promote. Your offer could be a discount, a package or a complimentary extra that provides genuine value. You do not need to discount every night or every room.",
    },
    {
      q: "How do guests book and pay?",
      a: "Guests use the booking or contact options you provide, such as your booking website or phone number. You confirm availability and take payment directly. Viewing a deal does not reserve a room.",
    },
    {
      q: "Can I choose the dates and availability?",
      a: "You decide which nights, rooms and availability apply to your offer. Explain any minimum stays, blackout dates and restrictions clearly. Manage confirmed bookings through your own process; MegaDeal does not automatically synchronise your booking calendar.",
    },
  ],
  eligibleNoun: "accommodation and getaway businesses",
  service: {
    type: "Accommodation and getaway advertising",
    description:
      "Zero-commission advertising for Auckland hotels, motels, B&Bs, retreats, lodges, glamping and getaway packages. Guests book and pay the business directly.",
    audience: "Hotels, motels, B&Bs, boutique stays, retreats, lodges, glamping sites and holiday parks",
  },
  contactPrompt: "Have a question about your accommodation business?",
  finalHeading: "Ready to fill quieter nights?",
};

export default function TravelGetawaysAdvertisingPage() {
  return <IndustryAdvertisePage content={CONTENT} />;
}
