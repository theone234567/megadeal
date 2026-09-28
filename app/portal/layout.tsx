import type { Metadata } from "next";
import PortalShell from "@/components/portal/PortalShell";
import { WixProvider } from "@/context/WixProvider";

// The merchant portal shows a signed-in merchant's own private business
// data (applications, deal drafts, credits) — never something to index.
export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
};

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  // Wix sign-in lives here, not in the root layout: see app/layout.tsx.
  return (
    <WixProvider>
      <PortalShell>{children}</PortalShell>
    </WixProvider>
  );
}
