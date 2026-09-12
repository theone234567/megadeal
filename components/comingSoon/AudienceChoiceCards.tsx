import Link from "next/link";
import { HeartIcon, StoreIcon } from "@/components/icons";
import { fredoka } from "@/lib/fonts";

export default function AudienceChoiceCards() {
  return (
    <section className="px-6 pt-8 lg:px-10">
      <div className="mx-auto grid max-w-[1360px] gap-5 sm:grid-cols-2">
        <div className="flex flex-col rounded-2xl bg-brand-50 p-6 sm:p-8">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-ember-600">
            <HeartIcon className="h-7 w-7" />
          </span>
          <h2 className={`${fredoka.className} mt-4 text-2xl font-bold text-brand-900`}>
            Love a good deal?
          </h2>
          <p className="mt-2 flex-1 text-sm text-slate-600">
            Be the first to know when we launch in Auckland and get early
            access to amazing local offers.
          </p>
          <a
            href="#get-notified"
            className="mt-5 inline-flex w-fit items-center gap-1.5 rounded-full bg-ember-500 px-6 py-3 text-sm font-bold text-white transition hover:bg-ember-600 active:scale-95"
          >
            Get launch updates →
          </a>
        </div>

        <div className="flex flex-col rounded-2xl bg-ember-50 p-6 sm:p-8">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-brand-600">
            <StoreIcon className="h-7 w-7" />
          </span>
          <h2 className={`${fredoka.className} mt-4 text-2xl font-bold text-brand-900`}>
            Run a local business?
          </h2>
          <p className="mt-2 flex-1 text-sm text-slate-600">
            Join before launch and reach new customers with{" "}
            <strong className="font-extrabold text-ember-600">
              up to 6 months advertising free
            </strong>
            .*
          </p>
          <Link
            href="/list-your-business"
            className="mt-5 inline-flex w-fit items-center gap-1.5 rounded-full bg-brand-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-brand-700 active:scale-95"
          >
            List my business →
          </Link>
        </div>
      </div>
    </section>
  );
}
