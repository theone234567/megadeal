import type { LocationStatus } from "@/lib/geo";

/** Inline feedback shown under the sort control while "Nearest to me" is
 * selected — the only sort option that needs the browser's permission. */
export default function NearMeStatus({
  status,
  onRetry,
}: {
  status: LocationStatus;
  onRetry: () => void;
}) {
  if (status === "loading") {
    return <p className="mb-3 text-xs text-slate-500">📍 Finding deals near you…</p>;
  }
  if (status === "denied") {
    return (
      <p className="mb-3 text-xs text-slate-500">
        Location access was blocked, so we can&apos;t sort by distance — allow
        location for this site in your browser settings, then{" "}
        <button type="button" onClick={onRetry} className="font-semibold text-brand-600 underline">
          try again
        </button>
        .
      </p>
    );
  }
  if (status === "unsupported" || status === "error") {
    return (
      <p className="mb-3 text-xs text-slate-500">
        Couldn&apos;t get your location — showing deals ending soonest instead.
      </p>
    );
  }
  return null;
}
