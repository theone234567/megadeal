"use client";

import Link from "next/link";
import { useRef } from "react";
import { ArrowRightIcon, CloseIcon, MenuIcon, StoreIcon } from "@/components/icons";

const LINKS = [
  { href: "/how-it-works", label: "How it works" },
  { href: "/redeem", label: "How to redeem a deal" },
  { href: "/help", label: "Help centre" },
  { href: "/about", label: "About MegaDeal" },
  { href: "/contact", label: "Contact us" },
];

/**
 * The phone menu: information links and the business entry. No customer
 * account, saved deals or sign-in — deal hunters don't have accounts.
 *
 * A native <dialog> opened with showModal(): it traps focus, closes on
 * Escape and hides the rest of the page from screen readers, with no
 * extra code. Focus goes back to the menu button when it closes.
 */
export default function MobileMenu() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const close = () => dialogRef.current?.close();

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-label="Open menu"
        aria-haspopup="dialog"
        onClick={() => dialogRef.current?.showModal()}
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-hp-ink hover:bg-hp-lavender focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hp-purple"
      >
        <MenuIcon className="h-6 w-6" />
      </button>
      <dialog
        ref={dialogRef}
        aria-labelledby="mobile-menu-title"
        onClose={() => buttonRef.current?.focus()}
        // A click on the backdrop lands on the dialog element itself.
        onClick={(e) => {
          if (e.target === dialogRef.current) close();
        }}
        className="m-0 ml-auto h-full max-h-none w-[min(20rem,88vw)] max-w-none bg-white p-0 text-hp-ink shadow-xl backdrop:bg-hp-ink/40"
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-hp-line px-5 py-4">
            <h2 id="mobile-menu-title" className="font-display text-xl font-bold">
              Menu
            </h2>
            <button
              type="button"
              onClick={close}
              aria-label="Close menu"
              className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-hp-lavender focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hp-purple"
            >
              <CloseIcon className="h-5 w-5" />
            </button>
          </div>
          <nav aria-label="Menu" className="flex-1 overflow-y-auto px-3 py-3">
            <ul>
              {LINKS.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    onClick={close}
                    className="flex min-h-[48px] items-center rounded-xl px-3 text-base font-semibold hover:bg-hp-lavender focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-hp-purple"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <div className="space-y-2 border-t border-hp-line p-5">
            <p className="pb-1 text-sm font-semibold text-hp-muted">For businesses</p>
            <Link href="/list-your-business" onClick={close} className="btn-primary w-full min-h-[48px] text-base">
              <StoreIcon className="h-5 w-5" />
              List your business
              <ArrowRightIcon className="h-4 w-4" />
            </Link>
            <Link href="/portal" onClick={close} className="btn-secondary w-full min-h-[48px] text-base">
              Business sign in
            </Link>
          </div>
        </div>
      </dialog>
    </>
  );
}
