"use client";

import { useState } from "react";
import ShareButtons from "@/components/ShareButtons";
import { SITE_URL } from "@/lib/siteConfig";

export default function ReferralCard({ referralCode }: { referralCode?: string }) {
  const [copied, setCopied] = useState(false);

  if (!referralCode) return null;

  const referralUrl = `${SITE_URL}/businesses?ref=${referralCode}`;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(referralUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access can be denied — the copy button just won't confirm.
    }
  }

  return (
    <div className="mt-6 rounded-2xl border border-brand-100 bg-brand-50 p-6 shadow-card">
      <h2 className="text-lg font-bold text-slate-900">🤝 Refer a business</h2>
      <p className="mt-1 text-sm text-slate-600">
        Know another business that would fit MegaDeal? Share your link — when
        they sign up and get approved, you both get 2 bonus deal credits.
      </p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          readOnly
          value={referralUrl}
          onClick={(e) => e.currentTarget.select()}
          className="w-full min-w-0 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 outline-none"
        />
        <button
          type="button"
          onClick={copyLink}
          className="shrink-0 rounded-full bg-brand-600 px-5 py-2 text-sm font-bold text-white transition hover:bg-brand-700 active:scale-95"
        >
          {copied ? "Copied ✓" : "Copy link"}
        </button>
      </div>
      <ShareButtons
        title="Join me on MegaDeal — advertise your business for free"
        url={referralUrl}
        label="Share your referral link"
        className="mt-3"
      />
    </div>
  );
}
