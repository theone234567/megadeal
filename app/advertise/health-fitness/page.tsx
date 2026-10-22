import type { Metadata } from "next";
import IndustryAdvertisePage, { type IndustryPageContent } from "@/components/business/IndustryAdvertisePage";
import { CalendarIcon, ClockIcon, DumbbellIcon, FlameIcon, FlowerIcon, SparklesIcon, UnlockIcon, UserIcon, UsersIcon, ZapIcon } from "@/components/icons";
import { SITE_NAME, SITE_URL } from "@/lib/siteConfig";

/**
 * /advertise/health-fitness: for Auckland gyms, studios and fitness
 * businesses (17 Oct 2026), so every customer category has its own
 * advertise page. Laid out by components/business/IndustryAdvertisePage.tsx.
 * No health claims: the offer is about classes, sessions and passes.
 */

const PATH = "/advertise/health-fitness";
const TITLE = "Gym & Fitness Advertising Auckland";
const DESCRIPTION =
  "Promote your Auckland gym, studio, classes or personal training with MegaDeal. Reach local customers, pay 0% commission and get the launch offer.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: `${SITE_URL}${PATH}` },
  openGraph: { siteName: SITE_NAME, locale: "en_NZ", title: `${TITLE} | MegaDeal`, description: DESCRIPTION, url: `${SITE_URL}${PATH}`, type: "website" },
  twitter: { card: "summary_large_image", title: `${TITLE} | MegaDeal`, description: DESCRIPTION },
};

const CONTENT: IndustryPageContent = {
  path: PATH,
  trackingName: "advertise_health_fitness",
  audience: "Gym & fitness advertising in Auckland",
  headline: "Fill off-peak classes.",
  headlineAccent: "Welcome new local members.",
  intro:
    "Introduce Aucklanders to your gym, studio, classes or training. You choose the offer, sessions and availability. Customers sign up and pay you directly.",
  heroPhoto: {
    src: "/megadeal-coming-soon/health-fitness-v1.webp",
    alt: "Adults attending a yoga class",
    width: 800,
    height: 600,
  },
  typesNavLabel: "Health & fitness business types",
  typesHeading: "Built for Health & Fitness businesses.",
  typesIntro:
    "From gyms and yoga studios to bootcamps and personal trainers, create an introductory offer around the sessions that make sense for your business.",
  types: [
    {
      id: "gyms",
      title: "Gyms",
      icon: DumbbellIcon,
      body: "Give locals an easy first step through the door with a clear introductory offer on selected memberships or passes.",
      ideas: ["Intro month", "Casual visit pack", "Starter session"],
    },
    {
      id: "yoga-pilates",
      title: "Yoga & Pilates",
      icon: FlowerIcon,
      body: "Introduce new students to your studio with a class pass or a beginners' course on your quieter timetable slots.",
      ideas: ["Class pass", "Intro week", "Beginners' course"],
    },
    {
      id: "fitness-classes",
      title: "Fitness Classes & Bootcamps",
      icon: FlameIcon,
      body: "Fill spaces in off-peak classes with a class pack or a bring-a-friend offer, while peak classes stay at their usual price.",
      ideas: ["Class pack", "Bring a friend", "Off-peak classes"],
    },
    {
      id: "personal-training",
      title: "Personal Training",
      icon: UserIcon,
      body: "Help new clients try training with you through a starter session or a small package at times that suit your diary.",
      ideas: ["Starter session", "Session pack", "Small-group training"],
    },
    {
      id: "martial-arts-dance",
      title: "Martial Arts & Dance",
      icon: ZapIcon,
      body: "Welcome beginners with trial classes or a short course, and explain the level, age group and what to bring.",
      ideas: ["Trial classes", "Beginner course", "Family class pack"],
    },
    {
      id: "swim-sports-coaching",
      title: "Swim & Sports Coaching",
      icon: SparklesIcon,
      body: "Promote trial lessons, holiday programmes or group coaching with clear dates, ages and places available.",
      ideas: ["Trial lesson", "Holiday programme", "Group coaching"],
    },
  ],
  value: {
    eyebrow: "Smarter local promotion",
    heading: "Turn empty spaces into new members.",
    body: "A space left in a class can't be filled once it has started. MegaDeal gives Auckland health and fitness businesses another way to promote selected sessions while keeping control of their busiest times.",
    cards: [
      { icon: CalendarIcon, title: "Fill Off-Peak Sessions", body: "Use selected classes, times or passes where you would genuinely like more people." },
      { icon: UsersIcon, title: "Reach New Locals", body: "Get discovered by Aucklanders looking for a gym, class or studio close to home or work." },
      { icon: ClockIcon, title: "Protect Your Peak Times", body: "Promote selected availability rather than discounting every class or membership." },
      { icon: UnlockIcon, title: "Stay in Control", body: "You choose the offer, sessions, booking requirements and conditions that suit your business." },
    ],
  },
  createStep: "Choose the class, pass or session, value, dates, availability and booking details.",
  bookStep: {
    title: "Customers Book Direct",
    body: "Customers discover your deal and sign up or book with your business. You take payment directly.",
  },
  faqs: [
    {
      q: "What types of health and fitness businesses can join?",
      a: "MegaDeal is designed for eligible local gyms, yoga and Pilates studios, fitness classes and bootcamps, personal trainers, martial arts and dance schools, and swim and sports coaching. Your business and offers must meet the current eligibility requirements.",
    },
    {
      q: "Do I have to discount every class or membership?",
      a: "No. Choose the classes, passes or sessions you want to promote. Your offer could be a discount, a package or a complimentary extra that provides genuine value. You do not need to discount your whole timetable.",
    },
    {
      q: "How do customers book and pay?",
      a: "Customers use the booking or contact options you provide, such as your booking website or phone number. You confirm availability and take payment directly. Viewing a deal does not reserve a place.",
    },
    {
      q: "Can I limit the offer to new customers?",
      a: "Yes. You can make your offer for new customers only and set any other conditions, such as an age limit or the times it can be used. Explain them clearly in the offer.",
    },
  ],
  eligibleNoun: "health and fitness businesses",
  service: {
    type: "Health and fitness advertising",
    description:
      "Zero-commission advertising for Auckland gyms, yoga and Pilates studios, fitness classes, personal trainers, martial arts, dance, swim and sports coaching. Customers book and pay the business directly.",
    audience: "Gyms, yoga and Pilates studios, fitness class and bootcamp providers, personal trainers, martial arts and dance schools, swim and sports coaches",
  },
  contactPrompt: "Have a question about your fitness business?",
  finalHeading: "Ready to fill off-peak classes?",
};

export default function HealthFitnessAdvertisingPage() {
  return <IndustryAdvertisePage content={CONTENT} />;
}
