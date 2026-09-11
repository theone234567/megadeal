import Link from "next/link";
import EmailSignupForm from "@/components/EmailSignupForm";
import ElephantMascot from "@/components/ElephantMascot";
import { fredoka } from "@/lib/fonts";
import { SITE_LAUNCHED } from "@/lib/siteConfig";

export default function LaunchSignup() {
  return (
    <section id="get-notified" className="scroll-mt-24 px-4 pt-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl rounded-2xl border border-slate-100 bg-white p-6 shadow-card sm:p-10">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className={`${fredoka.className} text-2xl font-bold text-brand-900 sm:text-3xl`}>
              Be the first to know
            </h2>
            <p className="mt-2 max-w-xl text-sm text-slate-600 sm:text-base">
              Sign up and we&apos;ll let you know when MegaDeal launches in
              Auckland, plus early access to special offers.
            </p>
          </div>
          {/* Small, doesn't overwhelm the form */}
          <ElephantMascot className="hidden shrink-0 sm:block" />
        </div>

        <div className="mt-6">
          <EmailSignupForm
            audience="customer"
            source="coming-soon"
            buttonLabel="Keep me posted →"
            accent="brand"
            surface="plain"
          />
        </div>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs font-medium text-slate-500">
          <span>✓ Free to join</span>
          <span>✓ No spam</span>
          <span>✓ Unsubscribe anytime</span>
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
