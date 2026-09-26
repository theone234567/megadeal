"use client";

import { usePathname } from "next/navigation";

const PRELAUNCH_PRIVATE = /^\/(?:category|deal|flash-deals|business)(?:\/|$)/;

/**
 * A fixed reminder that the page is an admin-only preview, so a
 * pre-launch customer page is never mistaken for what the public sees.
 *
 * Decided from the path alone, with no cookie check: before launch,
 * middleware.ts only lets a signed-in admin reach these routes at all, so
 * anyone who can see this banner is already an admin. `siteLaunched` comes
 * from the server layout (SITE_LAUNCHED isn't readable in the browser —
 * see Footer.tsx).
 */
export default function PreviewBanner({ siteLaunched }: { siteLaunched: boolean }) {
  const pathname = usePathname();
  if (siteLaunched || !pathname || !(pathname === "/" || PRELAUNCH_PRIVATE.test(pathname))) return null;

  return (
    <div
      role="status"
      className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-xs font-bold text-white shadow-card-hover"
    >
      <span aria-hidden className="h-2 w-2 rounded-full bg-amber-400" />
      Admin preview — only you can see this until launch
    </div>
  );
}
