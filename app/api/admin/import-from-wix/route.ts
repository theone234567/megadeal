import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/adminSession";
import { logAdminAction } from "@/lib/adminAudit";
import { fromOwnSite } from "@/lib/authSession";
import { dataBackend, withDb } from "@/lib/db/connection";
import { exportWix, type WixReader } from "@/lib/db/exportWix";
import { importWixExport } from "@/lib/db/importWix";
import { maintenanceOn } from "@/lib/maintenance";
import { SITE_URL } from "@/lib/siteConfig";
import { createWixAdminClient } from "@/lib/wixAdmin";

export const dynamic = "force-dynamic";

/**
 * Admin only: copies everything from Wix into MegaDeal's own database, the
 * button version of scripts/wix-export.mjs + scripts/wix-import.ts
 * (docs/WIX-MIGRATION.md, Stage 2), so switch day needs no terminal.
 *
 *   POST { mode: "rehearse" }  reads Wix, runs the whole import, checks
 *                              every rule, then undoes it: changes nothing.
 *   POST { mode: "import" }    the same, kept. Only while the site still
 *                              reads Wix (DATA_BACKEND isn't postgres yet)
 *                              and changes are paused (MAINTENANCE_MODE=
 *                              writes), so nothing changes in Wix midway.
 *
 * Both replace whatever an earlier run left in the new database: before
 * the switch it holds nothing else. The report names records with
 * problems; it's shown to the admin and never stored.
 */
const headers = { "Cache-Control": "private, no-store" };
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers });

export async function POST(req: NextRequest) {
  if (!(await isAdminRequest(req))) return json({ error: "Unauthorized." }, 401);
  if (!fromOwnSite(req, SITE_URL)) return json({ error: "Use the admin page." }, 403);
  const body = await req.json().catch(() => ({}));
  const mode = body?.mode === "import" ? "import" : body?.mode === "rehearse" ? "rehearse" : null;
  if (!mode) return json({ error: "Bad request." }, 400);

  // Once the site runs on the new database it holds the only copy of
  // everything since: importing over it would lose that.
  if (dataBackend() === "postgres") {
    return json({ error: "The site already runs on the new database, so copying from Wix again would overwrite newer changes." }, 409);
  }
  if (mode === "import" && !maintenanceOn()) {
    return json({ error: 'Pause changes first: add MAINTENANCE_MODE = "writes" to wrangler.toml and deploy, so nothing changes in Wix while it copies.' }, 409);
  }

  let exported;
  try {
    exported = await exportWix(createWixAdminClient() as unknown as WixReader);
  } catch (err) {
    console.error("[admin/import-from-wix] reading Wix failed", err);
    return json({ error: "Couldn't read from Wix. Please try again." }, 502);
  }
  if (Object.keys(exported.failed).length && mode === "import") {
    return json({ error: `Some of Wix couldn't be read in full (${Object.keys(exported.failed).join(", ")}), so nothing was imported. Try again.`, failed: exported.failed }, 502);
  }

  try {
    const report = await withDb((db) => importWixExport(db, exported.data, { commit: mode === "import", replace: true }));
    if (mode === "import") {
      const totals = Object.entries(report.counts).map(([k, c]) => `${k} ${c.imported}/${c.exported}`).join(", ");
      await logAdminAction({ action: "Copied the data from Wix into the new database", detail: `${totals}; ${report.issues.length} to check` });
    }
    return json({ mode, committed: report.committed, exported: exported.counts, failed: exported.failed, counts: report.counts, issues: report.issues, pausedDeals: report.pausedDeals });
  } catch (err) {
    console.error("[admin/import-from-wix] import failed", err);
    return json({ error: `The import stopped and nothing was kept: ${err instanceof Error ? err.message : "unknown error"}` }, 500);
  }
}
