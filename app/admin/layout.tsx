import type { Metadata } from "next";
import { WixProvider } from "@/context/WixProvider";

// The admin dashboard is a private back-office tool, not public content —
// keep it out of search results and AI crawlers' indexes entirely.
export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  // The admin pages check whether a business account is also signed in on
  // this browser; Wix sign-in lives here, not in the root layout.
  return <WixProvider>{children}</WixProvider>;
}
