import type { Metadata } from "next";

// The merchant portal shows a signed-in merchant's own private business
// data (applications, deal drafts, credits) — never something to index.
export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
};

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return children;
}
