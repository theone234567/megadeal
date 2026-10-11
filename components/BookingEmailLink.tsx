"use client";

import { useSyncExternalStore } from "react";
import { MailIcon } from "@/components/icons";
import { revealEmail } from "@/lib/hiddenEmail";

const noop = () => () => {};

/**
 * A business's booking email from hideEmail() (lib/hiddenEmail.ts): the
 * page's HTML holds only the encoded form, and the browser shows the real
 * address and mailto link once the page is running, so address-harvesting
 * bots reading the raw HTML find nothing.
 */
export default function BookingEmailLink({ hidden, className }: { hidden: string; className?: string }) {
  // False on the server and during hydration, true afterwards.
  const running = useSyncExternalStore(noop, () => true, () => false);
  const address = running ? revealEmail(hidden) : null;
  if (!address) {
    return (
      <span className={className}>
        <MailIcon className="h-4 w-4 shrink-0" /> Email
      </span>
    );
  }
  return (
    <a href={`mailto:${address}`} className={className}>
      <MailIcon className="h-4 w-4 shrink-0" /> {address}
    </a>
  );
}
