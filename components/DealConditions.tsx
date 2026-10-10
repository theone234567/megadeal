import { splitTermsForDisplay } from "@/lib/dealTerms";

/**
 * A deal's conditions as a list, one per line (two columns where there's
 * room), instead of one long run-on sentence. Each line is exactly as the
 * business wrote it or ticked it (lib/dealTerms.ts). Used everywhere the
 * conditions are shown, so they read the same in the form, the portal,
 * admin and on the deal page.
 */
export default function DealConditions({
  terms,
  size = "md",
  className = "",
}: {
  terms: string | null | undefined;
  size?: "sm" | "md";
  className?: string;
}) {
  const lines = terms ? splitTermsForDisplay(terms) : [];
  if (lines.length === 0) return null;
  return (
    <ul
      className={`grid gap-x-6 sm:grid-cols-2 ${
        size === "sm" ? "gap-y-1 text-xs" : "gap-y-2 text-[0.9375rem]"
      } ${className}`}
    >
      {lines.map((line, i) => (
        <li key={i} className="flex items-start gap-2 leading-snug">
          <span aria-hidden="true" className="mt-[0.45em] h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" />
          <span className="min-w-0">{line}</span>
        </li>
      ))}
    </ul>
  );
}
