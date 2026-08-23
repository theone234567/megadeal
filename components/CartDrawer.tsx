"use client";

import Image from "next/image";
import { useWix } from "@/context/WixProvider";

export default function CartDrawer() {
  const { cart, cartOpen, setCartOpen, removeLineItem, clearCart, checkout, isCheckingOut } =
    useWix();

  const lineItems: any[] = cart?.lineItems ?? [];

  return (
    <>
      {cartOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40"
          onClick={() => setCartOpen(false)}
        />
      )}
      <aside
        className={`fixed right-0 top-0 z-50 flex h-full w-full max-w-md transform flex-col bg-white shadow-2xl transition-transform duration-300 ${
          cartOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="text-lg font-bold text-slate-900">Your cart</h2>
          <button
            onClick={() => setCartOpen(false)}
            className="rounded-full p-2 text-slate-500 hover:bg-slate-100"
            aria-label="Close cart"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {lineItems.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-slate-500">
              <span className="text-4xl">🛒</span>
              <p>Your cart is empty.</p>
              <p className="text-sm">Grab a deal before it&apos;s gone!</p>
            </div>
          ) : (
            <ul className="space-y-4">
              {lineItems.map((item) => (
                <li key={item._id ?? item.id} className="flex gap-3">
                  <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                    {item.image ? (
                      <Image
                        src={typeof item.image === "string" ? item.image : item.image?.url}
                        alt={item.productName?.original ?? "Deal"}
                        fill
                        className="object-cover"
                        sizes="64px"
                      />
                    ) : null}
                  </div>
                  <div className="flex-1">
                    <p className="line-clamp-2 text-sm font-semibold text-slate-800">
                      {item.productName?.original ?? "Deal"}
                    </p>
                    <p className="text-sm text-slate-500">
                      Qty {item.quantity} ·{" "}
                      {item.price?.formattedAmount ?? item.price?.amount}
                    </p>
                    <button
                      onClick={() => removeLineItem(item._id ?? item.id)}
                      className="mt-1 text-xs font-medium text-ember-600 hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {lineItems.length > 0 && (
          <div className="space-y-3 border-t border-slate-100 px-5 py-4">
            <div className="flex items-center justify-between text-base font-semibold text-slate-900">
              <span>Subtotal</span>
              <span>{cart?.subtotal?.formattedAmount ?? "—"}</span>
            </div>
            <button
              onClick={checkout}
              disabled={isCheckingOut}
              className="w-full rounded-full bg-ember-500 py-3 text-center font-bold text-white shadow-card transition hover:bg-ember-600 disabled:opacity-60"
            >
              {isCheckingOut ? "Redirecting…" : "Checkout securely"}
            </button>
            <button
              onClick={clearCart}
              className="w-full rounded-full border border-slate-200 py-2 text-center text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              Clear cart
            </button>
          </div>
        )}
      </aside>
    </>
  );
}
