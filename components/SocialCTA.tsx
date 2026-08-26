import SocialLinks from "./SocialLinks";

export default function SocialCTA() {
  return (
    <section className="border-t border-slate-100 bg-slate-50">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-3 px-4 py-10 text-center sm:px-6 lg:px-8">
        <h2 className="text-lg font-bold text-slate-900">❤️ Love MegaDeal?</h2>
        <p className="max-w-md text-sm text-slate-500">
          Follow us for daily deal drops, flash offers and new local
          businesses joining every week.
        </p>
        <SocialLinks />
      </div>
    </section>
  );
}
