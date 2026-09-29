import type { ComponentType } from "react";
import {
  CarIcon,
  HomeIcon,
  LeafIcon,
  SparklesIcon,
  WheelIcon,
  WrenchIcon,
} from "@/components/icons";

/**
 * The six business types on /advertise/home-car, each with four example
 * offer ideas and a note on what to spell out. Editorial copy from the
 * Home & Car business pack (OFFER-IDEAS.json, 29 Sep 2026), word for word:
 * examples for inspiration, not live deals, and never merchant data.
 */
export interface OfferIdea {
  title: string;
  description: string;
  /** What a business running this offer should spell out. */
  scopeNote: string;
}

export interface BusinessType {
  /** Also the section's anchor, linked from the shortcuts under the hero. */
  id: string;
  title: string;
  icon: ComponentType<{ className?: string }>;
  /** public/images/home-car-business/<image>-640.webp and -1200.webp */
  image: string;
  imageAlt: string;
  intro: string;
  ideas: OfferIdea[];
}

export const BUSINESS_TYPES: BusinessType[] = [
  {
    id: "cleaning",
    title: "Cleaning",
    icon: SparklesIcon,
    image: "cleaning",
    imageAlt: "A cleaner at work in a bright living room",
    intro:
      "Give new customers a clear first step into your cleaning service. A focused package can introduce your business while keeping the work, property size and service area manageable.",
    ideas: [
      {
        title: "First-home-clean package",
        description:
          "Introduce your business with a defined clean for new customers.",
        scopeNote:
          "Specify hours, rooms, tasks, supplies and any property-size limit.",
      },
      {
        title: "Midweek oven clean",
        description: "Promote oven cleaning on selected quieter weekdays.",
        scopeNote:
          "State oven type, size and whether racks or additional appliances are included.",
      },
      {
        title: "Carpet + upholstery bundle",
        description:
          "Combine selected carpet areas with a sofa or chair clean.",
        scopeNote:
          "Define room sizes, seat count, fabric exclusions and extra stain-treatment charges.",
      },
      {
        title: "End-of-tenancy clean",
        description: "Offer a clear cleaning package for people moving out.",
        scopeNote:
          "Define property size and inclusions; do not guarantee a bond refund.",
      },
    ],
  },
  {
    id: "garden-outdoors",
    title: "Garden & Outdoors",
    icon: LeafIcon,
    image: "gardening",
    imageAlt: "A lawn mower on a freshly cut lawn in a garden",
    intro:
      "Help local homeowners get on top of their outdoor jobs. Promote a well-defined service in suburbs you already cover, with enough detail to manage travel time, access and workload.",
    ideas: [
      {
        title: "Lawn mow + edges",
        description: "Bundle mowing and edge trimming for a tidy finish.",
        scopeNote:
          "Set a lawn-area limit and explain slope, access and overgrown-lawn conditions.",
      },
      {
        title: "Seasonal garden tidy",
        description: "Offer a fixed block of time for selected garden tasks.",
        scopeNote:
          "List included tasks, labour hours and whether green-waste removal is included.",
      },
      {
        title: "Hedge-trimming package",
        description:
          "Promote trimming for suitable hedges in your service area.",
        scopeNote:
          "Specify length, height, access and waste disposal; quote larger work separately.",
      },
      {
        title: "Driveway water blasting",
        description: "Promote cleaning for eligible driveways or paved areas.",
        scopeNote:
          "Specify surface type and area; assess suitability and explain water/access requirements.",
      },
    ],
  },
  {
    id: "home-maintenance",
    title: "Home Maintenance",
    icon: HomeIcon,
    image: "home-maintenance",
    imageAlt: "A tradesperson with gloved hands cleaning a roof gutter",
    intro:
      "Show local homeowners which jobs your business can help with. Specific, manageable packages make it easier to understand the work and request the right service.",
    ideas: [
      {
        title: "Single-storey gutter clean",
        description: "Promote a gutter clean for eligible homes.",
        scopeNote:
          "Define gutter length, safe-access requirements, downpipe scope and disposal.",
      },
      {
        title: "Window-cleaning package",
        description: "Bundle selected inside or outside windows.",
        scopeNote:
          "State pane count, storeys, access and whether tracks or screens are included.",
      },
      {
        title: "Small handyman job bundle",
        description:
          "Offer a time allowance for a defined list of small tasks.",
        scopeNote:
          "Specify eligible work, labour, materials and exclusions; preserve applicable trade requirements.",
      },
      {
        title: "Seasonal home check",
        description:
          "Offer a visual check with a written list of maintenance observations.",
        scopeNote:
          "Describe its scope accurately; do not call it a certified inspection unless that is the actual qualified service.",
      },
    ],
  },
  {
    id: "car-wash-detailing",
    title: "Car Wash & Detailing",
    icon: CarIcon,
    image: "car-detailing",
    imageAlt: "A detailer washing a car by hand",
    intro:
      "Turn spare wash-bay or mobile-detailing capacity into a reason to try your business. Make each package easy to compare by clearly describing the finish and vehicle coverage.",
    ideas: [
      {
        title: "Midweek full valet",
        description:
          "Promote an interior and exterior package on selected weekdays.",
        scopeNote:
          "List every included task, vehicle sizes, booking rules and extra-soiling charges.",
      },
      {
        title: "Interior deep clean",
        description:
          "Offer a focused clean for seats, carpets and interior surfaces.",
        scopeNote:
          "Specify the methods and inclusions; explain pet-hair, stain and odour exclusions.",
      },
      {
        title: "Wash + wax package",
        description:
          "Combine an exterior wash with a defined protective finish.",
        scopeNote:
          "Name what is applied and the coverage; avoid unsupported durability claims.",
      },
      {
        title: "Two-car household offer",
        description: "Bundle eligible vehicles at one location or booking.",
        scopeNote:
          "Define vehicle eligibility, location, access and how the package price is calculated.",
      },
    ],
  },
  {
    id: "servicing-repairs",
    title: "Servicing & Repairs",
    icon: WrenchIcon,
    image: "car-servicing",
    imageAlt: "A mechanic working in a car's engine bay",
    intro:
      "Give drivers a clear reason to discover your workshop. Promote services you can price and deliver consistently, with vehicle eligibility and possible extra work explained upfront.",
    ideas: [
      {
        title: "Oil + filter package",
        description: "Promote an oil and filter change for selected vehicles.",
        scopeNote:
          "Specify eligible vehicles, oil specification and quantity, filter, labour and extra charges.",
      },
      {
        title: "Off-peak service booking",
        description:
          "Offer selected service packages during quieter workshop periods.",
        scopeNote:
          "Name the service scope and available days; do not imply live availability without integration.",
      },
      {
        title: "Battery check package",
        description:
          "Introduce a battery testing service with clearly listed checks.",
        scopeNote:
          "State what the test covers and whether replacement parts or fitting cost extra.",
      },
      {
        title: "Diagnostic assessment",
        description: "Offer a defined initial diagnostic assessment.",
        scopeNote:
          "Set the time allowance and report scope; assessment does not guarantee a diagnosis or repair.",
      },
    ],
  },
  {
    id: "tyres-wheels",
    title: "Tyres & Wheels",
    icon: WheelIcon,
    image: "tyres-wheels",
    imageAlt: "A technician fitting a car wheel",
    intro:
      "Introduce drivers to your tyre and wheel services with a specific, easy-to-understand offer. Clear vehicle and equipment requirements help customers choose an appropriate booking.",
    ideas: [
      {
        title: "Wheel alignment",
        description: "Promote an alignment for eligible vehicles.",
        scopeNote:
          "State two-wheel or four-wheel scope and any adjustments, exclusions or extra work.",
      },
      {
        title: "Rotation + balancing",
        description: "Bundle tyre rotation with balancing for eligible wheels.",
        scopeNote: "Specify wheel count, sizes, compatibility and exclusions.",
      },
      {
        title: "Selected tyre package",
        description: "Create a package for named tyre sizes or ranges.",
        scopeNote:
          "Specify products, quantity, fitting, balancing, disposal, availability and total applicable charges.",
      },
      {
        title: "Puncture assessment",
        description: "Offer an assessment of a damaged tyre.",
        scopeNote:
          "Repair is subject to suitability; show assessment and repair charges separately when applicable.",
      },
    ],
  },
];
