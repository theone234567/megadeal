"use client";

import Link from "next/link";
import { effectiveContact, availableMethods, contactSummary, leadingMethod, type ContactDetails, type ContactOverride } from "@/lib/contactOverride";
import { CONTACT_METHOD_LABELS, resolveDealContact, type ContactMethod } from "@/lib/dealContact";
import type { BookingRequirement } from "@/lib/booking";
import { MAX_INSTRUCTIONS } from "@/lib/dealDraft";
import { CheckIcon } from "@/components/icons";

const FIELDS: { key: "bookingUrl" | "phone" | "website" | "email"; label: string; type: string; placeholder: string }[] = [
  { key: "phone", label: "Phone", type: "tel", placeholder: "e.g. 09 123 4567" },
  { key: "bookingUrl", label: "Booking link", type: "url", placeholder: "https://yourbusiness.co.nz/book" },
  { key: "website", label: "Website", type: "url", placeholder: "https://yourbusiness.co.nz" },
  { key: "email", label: "Email", type: "email", placeholder: "bookings@yourbusiness.co.nz" },
];

/**
 * "Booking & contact" on the deal form: by default the deal uses the
 * business's details (entered once on its profile), shown as a one-line
 * summary. "Edit for this deal" gives the deal its own; that never changes
 * the profile or the business's other deals, and "Use business details"
 * goes back. Clearing a field here means none for this deal, not the
 * business's again. Then the business's own short note, and a preview of
 * what customers see with the code (lib/dealContact.ts, as the deal page).
 */
export default function DealContactSection({
  business,
  override,
  onOverrideChange,
  instructions,
  onInstructionsChange,
  requirement,
  code,
  codeWebsiteUrl,
  businessName,
  dealName,
  error,
}: {
  business: ContactDetails;
  override: ContactOverride | null;
  onOverrideChange: (o: ContactOverride | null) => void;
  instructions: string;
  onInstructionsChange: (v: string) => void;
  requirement: BookingRequirement;
  code: string | null;
  codeWebsiteUrl: string | null;
  businessName: string | null;
  dealName: string;
  error?: string | null;
}) {
  const editing = override !== null;
  const details = effectiveContact(business, override);
  const methods = availableMethods(details);
  const lead = leadingMethod(details);
  const preview = resolveDealContact({
    requirement,
    businessName,
    dealName: dealName || "Your deal",
    code,
    phone: details.phone,
    email: details.email,
    website: details.website,
    bookingUrl: details.bookingUrl,
    codeWebsiteUrl,
    directionsUrl: null,
    addressText: null,
    preferred: details.preferred,
  });
  const set = (patch: ContactOverride) => onOverrideChange({ ...(override ?? {}), ...patch });
  const input = "w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-400";

  return (
    <fieldset id="deal-contact" className="scroll-mt-24">
      <legend className="mb-1 block font-display text-base font-bold text-slate-900">Booking &amp; contact</legend>

      {!editing ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-brand-50 p-3.5 sm:max-w-xl">
          <div className="flex min-w-0 items-start gap-2.5">
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-600 text-white">
              <CheckIcon className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-bold text-slate-900">Using your business details</p>
              <p className="text-sm text-slate-700">
                {methods.length > 0 ? (
                  contactSummary(details)
                ) : (
                  <>
                    No contact details yet.{" "}
                    <Link href="/portal/profile" className="font-semibold text-brand-700 underline">
                      Add them to your profile
                    </Link>
                  </>
                )}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onOverrideChange({})}
            className="text-sm font-bold text-brand-700 underline underline-offset-2 hover:text-brand-800"
          >
            Edit for this deal
          </button>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 p-3.5 sm:max-w-xl">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-bold text-slate-900">Contact details for this deal only</p>
            <button
              type="button"
              onClick={() => onOverrideChange(null)}
              className="text-sm font-bold text-brand-700 underline underline-offset-2 hover:text-brand-800"
            >
              Use business details
            </button>
          </div>
          <p className="mt-0.5 text-xs text-slate-600">
            Your profile and other deals stay as they are. Leave a box empty for none on this deal.
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {FIELDS.map((f) => (
              <div key={f.key}>
                <label htmlFor={`deal-contact-${f.key}`} className="mb-1 block text-xs font-semibold text-slate-700">
                  {f.label}
                </label>
                <input
                  id={`deal-contact-${f.key}`}
                  type={f.type}
                  inputMode={f.type === "tel" ? "tel" : f.type === "url" ? "url" : f.type === "email" ? "email" : undefined}
                  value={details[f.key] ?? ""}
                  maxLength={f.key === "phone" ? 40 : 500}
                  onChange={(e) => set({ [f.key]: e.target.value })}
                  placeholder={f.placeholder}
                  className={input}
                />
              </div>
            ))}
          </div>
          {methods.length > 1 && (
            <div className="mt-3">
              <label htmlFor="deal-contact-preferred" className="mb-1 block text-xs font-semibold text-slate-700">
                Main customer button
              </label>
              <select
                id="deal-contact-preferred"
                value={lead ?? ""}
                onChange={(e) => set({ preferred: e.target.value as ContactMethod })}
                className={`${input} sm:max-w-xs`}
              >
                {methods.map((m) => (
                  <option key={m} value={m}>
                    {CONTACT_METHOD_LABELS[m]}
                  </option>
                ))}
              </select>
            </div>
          )}
          {methods.length === 0 && (
            <p className="mt-2 text-xs font-semibold text-amber-800">Add at least one way for customers to reach you.</p>
          )}
        </div>
      )}
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      <label htmlFor="deal-instructions" className="mb-1 mt-4 block text-sm font-bold text-slate-900">
        Special instructions <span className="font-normal text-slate-500">(optional)</span>
      </label>
      <textarea
        id="deal-instructions"
        rows={2}
        maxLength={MAX_INSTRUCTIONS}
        value={instructions}
        onChange={(e) => onInstructionsChange(e.target.value)}
        placeholder="e.g. Mention your code when you arrive. Pay at the counter."
        aria-describedby="deal-instructions-count"
        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand-400 sm:max-w-xl"
      />
      <p id="deal-instructions-count" className="mt-0.5 text-xs text-slate-500">
        Shown with the code, in your words. {instructions.length}/{MAX_INSTRUCTIONS}
      </p>

      {/* What customers see with the code: the same wording and buttons as
          the deal page. */}
      <div className="mt-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3.5 sm:max-w-xl">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Customer preview</p>
        <p className="mt-1 text-sm text-slate-700">{preview.instruction}</p>
        {instructions.trim() && (
          <p className="mt-1 text-sm text-slate-800">
            <span className="font-semibold">From {businessName || "you"}:</span> {instructions.trim()}
          </p>
        )}
        {(preview.primary || preview.secondary) && (
          <div className="mt-2 flex flex-wrap gap-2" aria-hidden="true">
            {preview.primary && (
              <span className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-bold text-white">
                {preview.primary.label}
                {preview.primary.external ? " ↗" : ""}
              </span>
            )}
            {preview.secondary && (
              <span className="rounded-xl border-[1.5px] border-brand-600 bg-white px-4 py-2 text-sm font-bold text-brand-700">
                {preview.secondary.label}
                {preview.secondary.external ? " ↗" : ""}
              </span>
            )}
          </div>
        )}
        {preview.links.length > 0 && (
          <p className="mt-2 text-xs text-slate-600">Also: {preview.links.map((l) => l.label).join(" · ")}</p>
        )}
      </div>
    </fieldset>
  );
}
