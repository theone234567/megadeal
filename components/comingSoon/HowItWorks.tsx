import { Fragment } from "react";
import { SearchIcon, TicketIcon, PhoneIcon } from "@/components/icons";
import { fredoka } from "@/lib/fonts";

const STEPS = [
  {
    number: 1,
    icon: SearchIcon,
    title: "Find a deal",
    text: "Browse offers from local Auckland businesses.",
  },
  {
    number: 2,
    icon: TicketIcon,
    title: "Get the deal code",
    text: "No payment or voucher purchase required.",
  },
  {
    number: 3,
    icon: PhoneIcon,
    title: "Book direct & enjoy",
    text: "Contact the business, quote your code and pay them directly.",
  },
];

function StepArrow() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="hidden h-6 w-6 shrink-0 text-brand-300 sm:block"
    >
      <line x1="4" y1="12" x2="20" y2="12" />
      <polyline points="13,5 20,12 13,19" />
    </svg>
  );
}

export default function HowItWorks() {
  return (
    <section className="px-6 pt-10 lg:px-10">
      <div className="mx-auto max-w-[1360px] rounded-2xl bg-brand-50 p-6 sm:p-10">
        <h2 className={`${fredoka.className} text-2xl font-bold text-brand-900 sm:text-3xl`}>
          How MegaDeal will work
        </h2>
        <div className="mt-8 flex flex-col gap-8 sm:flex-row sm:items-start">
          {STEPS.map(({ number, icon: Icon, title, text }, i) => (
            <Fragment key={number}>
              <div className="flex flex-1 items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-600 text-sm font-extrabold text-white">
                  {number}
                </span>
                <div>
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-brand-600 shadow-sm">
                    <Icon className="h-6 w-6" />
                  </span>
                  <h3 className="mt-3 font-bold text-slate-900">{title}</h3>
                  <p className="mt-1 text-sm text-slate-600">{text}</p>
                </div>
              </div>
              {i < STEPS.length - 1 && (
                <div className="hidden items-center pt-4 sm:flex">
                  <StepArrow />
                </div>
              )}
            </Fragment>
          ))}
        </div>
      </div>
    </section>
  );
}
