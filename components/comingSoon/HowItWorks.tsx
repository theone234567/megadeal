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

export default function HowItWorks() {
  return (
    <section className="px-4 pt-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl rounded-2xl bg-brand-50 p-6 sm:p-10">
        <h2 className={`${fredoka.className} text-2xl font-bold text-brand-900 sm:text-3xl`}>
          How MegaDeal will work
        </h2>
        <div className="mt-8 grid grid-cols-1 gap-8 sm:grid-cols-3">
          {STEPS.map(({ number, icon: Icon, title, text }) => (
            <div key={number} className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-600 text-sm font-extrabold text-white">
                {number}
              </span>
              <div>
                <span className="mb-1 flex h-8 w-8 items-center justify-center rounded-full bg-white text-brand-600 shadow-sm">
                  <Icon className="h-4 w-4" />
                </span>
                <h3 className="mt-2 font-bold text-slate-900">{title}</h3>
                <p className="mt-1 text-sm text-slate-600">{text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
