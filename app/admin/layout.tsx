import type { Metadata } from "next";
import { SessionProvider } from "@/context/SessionProvider";

// The admin dashboard is a private back-office tool, not public content —
// keep it out of search results and AI crawlers' indexes entirely.
export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  // The admin pages check whether a business account is also signed in on
  // this browser; the session lives here, not in the root layout.
  return <SessionProvider>{children}</SessionProvider>;
}
