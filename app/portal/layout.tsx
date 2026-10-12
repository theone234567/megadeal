import type { Metadata } from "next";
import PortalShell from "@/components/portal/PortalShell";
import { SessionProvider } from "@/context/SessionProvider";

// The merchant portal shows a signed-in merchant's own private business
// data (applications, deal drafts, credits) — never something to index.
export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
};

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  // The session lives here, not in the root layout: see app/layout.tsx.
  return (
    <SessionProvider>
      <PortalShell>{children}</PortalShell>
    </SessionProvider>
  );
}
