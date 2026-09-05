import { Suspense } from "react";
import { SITE_LAUNCHED } from "@/lib/siteConfig";
import NewDealForm from "./NewDealForm";

// SITE_LAUNCHED is a server-only env var (no NEXT_PUBLIC_ prefix), so this
// stays a server component just to read it and hand it down as a prop —
// NewDealForm needs it client-side to gate real submissions pre-launch.
export default function NewDealPage() {
  return (
    <Suspense fallback={null}>
      <NewDealForm siteLaunched={SITE_LAUNCHED} />
    </Suspense>
  );
}
