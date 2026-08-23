"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useWix } from "@/context/WixProvider";

interface MerchantRecord {
  _id: string;
  businessName?: string;
  email?: string;
  phone?: string;
  website?: string;
  address?: string;
  city?: string;
  postcode?: string;
  couponCode?: string;
  creditsBalance?: number;
  status?: string;
}

interface DealRecord {
  _id: string;
  dealName?: string;
  productId?: string;
  expiresAt?: string;
}

export default function PortalPage() {
  const { client, member, isLoggedIn, login, logout } = useWix();
  const [merchant, setMerchant] = useState<MerchantRecord | null | undefined>(undefined);
  const [deals, setDeals] = useState<DealRecord[]>([]);

  useEffect(() => {
    if (member === undefined) return; // still resolving auth state
    if (!isLoggedIn) {
      setMerchant(null);
      return;
    }

    let cancelled = false;
    setMerchant(undefined);

    // Because the "Merchants" collection has SITE_MEMBER_AUTHOR read
    // permission, this query can only ever return items this signed-in
    // member created — Wix enforces that server-side, not this code.
    client.items
      .query("Merchants")
      .find()
      .then((result: any) => {
        if (cancelled) return;
        const record = result.items?.[0] ?? null;
        setMerchant(record);

        if (record?.email) {
          client.items
            .query("Deals")
            .eq("merchantEmail", record.email)
            .find()
            .then((dealsResult: any) => {
              if (!cancelled) setDeals(dealsResult.items ?? []);
            })
            .catch(() => {
              if (!cancelled) setDeals([]);
            });
        }
      })
      .catch(() => {
        if (!cancelled) setMerchant(null);
      });

    return () => {
      cancelled = true;
    };
  }, [client, member, isLoggedIn]);

  if (member === undefined || merchant === undefined) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-16 text-center">
        <p className="text-slate-400">Loading…</p>
      </main>
    );
  }

  if (!isLoggedIn) {
    return (
      <main className="mx-auto flex min-h-[50vh] max-w-md flex-col items-center justify-center px-4 text-center">
        <span className="text-4xl">🔒</span>
        <h1 className="mt-3 text-xl font-bold text-slate-900">Merchant portal</h1>
        <p className="mt-2 text-sm text-slate-500">
          Sign in to view your business details, deal credits and active
          deals. Only you can see your own account.
        </p>
        <button
          onClick={() => login("/portal")}
          className="mt-6 rounded-full bg-brand-600 px-6 py-3 text-sm font-bold text-white shadow-card transition hover:bg-brand-700"
        >
          Sign in
        </button>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-slate-900">Merchant portal</h1>
        <button
          onClick={logout}
          className="text-sm font-medium text-slate-500 hover:text-brand-700"
        >
          Sign out
        </button>
      </div>

      {!merchant ? (
        <div className="mt-6 rounded-2xl border border-dashed border-slate-200 p-8 text-center">
          <p className="text-slate-600">
            You&apos;re signed in, but we don&apos;t have a business
            application on file for this account yet.
          </p>
          <Link
            href="/merchants#signup"
            className="mt-4 inline-block rounded-full bg-ember-500 px-5 py-2.5 text-sm font-bold text-white hover:bg-ember-600"
          >
            Sign up your business
          </Link>
        </div>
      ) : (
        <>
          <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-card">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Deal credits
              </p>
              <p className="mt-1 text-4xl font-extrabold text-brand-700">
                {merchant.creditsBalance ?? 0}
              </p>
              <p className="mt-1 text-sm text-slate-500">
                1 credit = 1 deal listing. Contact us to top up.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-card">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Application status
              </p>
              <p className="mt-1 text-2xl font-extrabold text-slate-900">
                {merchant.status || "Pending"}
              </p>
              <p className="mt-1 text-sm text-slate-500">
                We&apos;ll email you once your first deal is ready to go live.
              </p>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-slate-100 bg-white p-6 shadow-card">
            <h2 className="text-lg font-bold text-slate-900">Business details</h2>
            <dl className="mt-4 grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-slate-400">Business name</dt>
                <dd className="font-medium text-slate-800">{merchant.businessName || "—"}</dd>
              </div>
              <div>
                <dt className="text-slate-400">Website</dt>
                <dd className="font-medium text-slate-800">{merchant.website || "—"}</dd>
              </div>
              <div>
                <dt className="text-slate-400">Email</dt>
                <dd className="font-medium text-slate-800">{merchant.email || "—"}</dd>
              </div>
              <div>
                <dt className="text-slate-400">Phone</dt>
                <dd className="font-medium text-slate-800">{merchant.phone || "—"}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-slate-400">Address</dt>
                <dd className="font-medium text-slate-800">
                  {[merchant.address, merchant.city, merchant.postcode]
                    .filter(Boolean)
                    .join(", ") || "—"}
                </dd>
              </div>
            </dl>
          </div>

          <div className="mt-6 rounded-2xl border border-slate-100 bg-white p-6 shadow-card">
            <h2 className="text-lg font-bold text-slate-900">Your deals</h2>
            {deals.length === 0 ? (
              <p className="mt-2 text-sm text-slate-500">
                No deals linked to your account yet.
              </p>
            ) : (
              <ul className="mt-4 space-y-3">
                {deals.map((deal) => (
                  <li
                    key={deal._id}
                    className="flex items-center justify-between rounded-xl border border-slate-100 px-4 py-3"
                  >
                    <span className="font-medium text-slate-800">{deal.dealName}</span>
                    <span className="text-sm text-slate-500">
                      Ends{" "}
                      {deal.expiresAt
                        ? new Date(deal.expiresAt).toLocaleDateString()
                        : "—"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </main>
  );
}
