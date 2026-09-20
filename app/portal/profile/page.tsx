"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useWix } from "@/context/WixProvider";
import MerchantProfileForm from "@/components/portal/MerchantProfileForm";
import PortalAuthScreen from "@/components/portal/PortalAuthScreen";
import { ArrowRightIcon } from "@/components/icons";

interface MerchantRecord {
  _id: string;
  businessName?: string;
  [key: string]: any;
}

// Independent fetch, mirroring /portal and /portal/new-deal — each portal
// route loads its own merchant record via the existing API rather than
// sharing state across routes, matching how this codebase already does it
// everywhere else in the portal.
export default function PortalProfilePage() {
  const { member, isLoggedIn } = useWix();
  const [merchant, setMerchant] = useState<MerchantRecord | null | undefined>(undefined);
  const [loadError, setLoadError] = useState(false);
  const [photosError, setPhotosError] = useState<string | null>(null);

  const loadMerchant = useCallback(() => {
    let cancelled = false;
    setMerchant(undefined);
    setLoadError(false);

    fetch("/api/merchants/me")
      .then((res) => {
        if (!res.ok) throw new Error(`status ${res.status}`);
        return res.json();
      })
      .then(({ item: record }) => {
        if (!cancelled) setMerchant(record ?? null);
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (member === undefined) return;
    if (!isLoggedIn) {
      setMerchant(null);
      setLoadError(false);
      return;
    }
    return loadMerchant();
  }, [member, isLoggedIn, loadMerchant]);

  async function handleChangePhotos(photos: string[]) {
    if (!merchant) return;
    setPhotosError(null);
    try {
      const res = await fetch("/api/merchants/photos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photos }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Couldn't save your photos.");
      }
      const { item: updated } = await res.json();
      setMerchant(updated);
    } catch (err: any) {
      setPhotosError(err?.message || "Couldn't save your photos. Please try again.");
      throw err;
    }
  }

  if (member === undefined || (merchant === undefined && !loadError)) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-16 text-center">
        <p className="text-slate-400">Loading…</p>
      </main>
    );
  }

  if (loadError) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-16 text-center">
        <p className="text-lg font-bold text-slate-900">Couldn&apos;t load your account</p>
        <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">
          Your business and deals are fine — this page just couldn&apos;t reach them. Please try
          again.
        </p>
        <button
          onClick={loadMerchant}
          className="mt-5 rounded-full bg-brand-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-brand-700"
        >
          Try again
        </button>
      </main>
    );
  }

  if (!isLoggedIn) {
    return (
      <PortalAuthScreen
        title="Business portal"
        intro="Your deals, your credits and your listing — all in one place."
        redirectTo="/portal/profile"
      />
    );
  }

  if (!merchant) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-16 text-center">
        <p className="text-lg font-bold text-slate-900">No listing to manage yet</p>
        <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">
          Finish your signup from the overview page first, then your business profile will be
          here to manage.
        </p>
        <Link
          href="/portal"
          className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-brand-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-brand-700"
        >
          Go to overview
          <ArrowRightIcon className="h-4 w-4" />
        </Link>
      </main>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/portal"
          className="inline-flex items-center gap-1 text-sm font-semibold text-slate-500 hover:text-brand-700"
        >
          ← Back to overview
        </Link>
        <h1 className="mt-2 text-[28px] font-extrabold leading-tight text-slate-900 sm:text-[32px]">
          Business profile
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Everything customers see on your listing, plus the contact and booking details behind
          it.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-card sm:p-8">
        <MerchantProfileForm
          merchant={merchant}
          onSaved={(updated) => setMerchant(updated)}
          onPhotosConfirm={handleChangePhotos}
          photosError={photosError}
        />
      </div>
    </div>
  );
}
