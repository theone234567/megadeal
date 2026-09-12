import Link from "next/link";
import EmailSignupForm from "@/components/EmailSignupForm";
import { fredoka } from "@/lib/fonts";
import { SITE_LAUNCHED } from "@/lib/siteConfig";

export default function LaunchSignup() {
  return (
    <section id="get-notified" className="scroll-mt-24 px-6 pt-10 lg:px-10">
      <div className="mx-auto max-w-[1360px] rounded-2xl bg-brand-50 p-6 sm:p-10">
        <div className="grid gap-6 lg:grid-cols-2 lg:items-center lg:gap-12">
          <div>
            <h2 className={`${fredoka.className} text-2xl font-bold text-brand-900 sm:text-3xl`}>
              Be the first to know
            </h2>
            <p className="mt-2 max-w-md text-sm text-slate-600 sm:text-base">
              Sign up and we&apos;ll let you know when MegaDeal launches in
              Auckland, plus early access to special offers.
            </p>
          </div>

          <div>
            <EmailSignupForm
              audience="customer"
              source="coming-soon"
              buttonLabel="Keep me posted →"
              accent="brand"
              surface="plain"
            />
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs font-medium text-slate-500">
              <span>✓ Free to join</span>
              <span>✓ No spam</span>
              <span>✓ Unsubscribe anytime</span>
            </div>
          </div>
        </div>

        {SITE_LAUNCHED && (
          <p className="mt-6 text-sm font-semibold text-slate-500">
            Curious now? You can already{" "}
            <Link href="/" className="text-brand-600 underline hover:text-brand-700">
              peek at the beta site
            </Link>
            .
          </p>
        )}
      </div>
    </section>
  );
}
