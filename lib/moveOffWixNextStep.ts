/** What the page has from app/api/admin/move-off-wix (lib/migrationReadiness.ts). */
interface Readiness {
  sections: { id: string; on: boolean; checks: { label: string; state: string; detail: string }[] }[];
  wixPhotosLeft: number | null;
}

/**
 * The one thing to do next, in order (docs/WIX-MIGRATION.md): database,
 * photos, then business logins, then ending Wix. Steps that are a
 * settings change Claude makes say so.
 */
export function nextStep(d: Readiness): string {
  const by = (id: string) => d.sections.find((s) => s.id === id);
  const db = by("database");
  const photos = by("photos");
  const logins = by("logins");
  const paused = db?.checks.some((c) => c.label === "Changes paused");
  if (db && !db.on) {
    const m = db.checks.find((c) => c.state === "missing" && c.label !== "Data copied from Wix");
    if (m) return `Database: ${m.label}. ${m.detail}`;
    if (paused) return "Changes are paused, so press Import for real in Database below. Then tell Claude, who switches the site onto the new database.";
    return "Press Rehearse (changes nothing) in Database below and send Claude a screenshot of the result. When it looks right, Claude pauses changes and you press Import for real.";
  }
  if (db?.on) {
    if (paused) return "Changes are still paused: tell Claude the switch is done, to turn saving back on.";
    if (db.checks.some((c) => c.label === "Tables up to date" && c.state === "missing")) return "Press Apply database updates in Database below.";
    if (photos && !photos.on) return "Tell Claude to switch photo storage on.";
    if ((d.wixPhotosLeft ?? 0) > 0) return "Press Copy photos from Wix in Photos below.";
  }
  if (logins && !logins.on) {
    const m = logins.checks.find((c) => c.state === "missing");
    return m ? `Business logins: ${m.label}. ${m.detail}` : "Business logins are ready: tell Claude to switch them on.";
  }
  if (logins?.on) return "Everything runs off Wix. Press Save a copy of Wix in Database, download it from Cloudflare R2, and end the Wix subscription in a couple of weeks.";
  return "";
}
