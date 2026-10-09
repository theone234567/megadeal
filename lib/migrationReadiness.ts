import "server-only";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { dataBackend, withDb, type Sql } from "./db/connection";
import { countWixPhotos } from "./db/copyPhotos";
import { MIGRATION_MARKERS } from "./db/migrationMarkers";
import { photoBucket, photoResizer, photoStorage } from "./photoStorage";
import { authBackend } from "./authSession";
import { isJwtKey } from "./supabaseAuth";
import { getRateLimitKv } from "./rateLimit";
import { LAST_RUN_KEY, backupBucket, latestBackup, latestWixCopy } from "./backupStorage";
import { maintenanceOn } from "./maintenance";
import { EMAIL_HOOK_REACHED_KEY, HOURLY_RUN_KEY } from "./kvMarkers";

/**
 * The admin "Moving off Wix" page (app/admin/move-off-wix): for each switch
 * in docs/WIX-MIGRATION.md, whether it's on and whether everything it needs
 * is in place, checked live and said in plain words.
 *
 * Read-only: it looks, it never changes anything. It never shows a secret,
 * only whether one is set; and an error from the database or a service is
 * logged here and shown as a plain sentence (a database error can name its
 * host and user).
 */

export type CheckState = "ok" | "missing" | "warning" | "info";

export interface Check {
  label: string;
  state: CheckState;
  detail: string;
  /** Step-by-step help the page shows under it. */
}

export interface Section {
  id: "database" | "photos" | "email" | "logins";
  title: string;
  /** The setting that turns it on, e.g. DATA_BACKEND=postgres. */
  switchName: string;
  on: boolean;
  /** Nothing missing here or in what it depends on. */
  ready: boolean;
  checks: Check[];
}

export interface Readiness {
  checkedAt: string;
  sections: Section[];
  /** Photos still on Wix, when the database can be read. */
  wixPhotosLeft: number | null;
}

type Fetch = typeof fetch;

const ok = (label: string, detail: string): Check => ({ label, state: "ok", detail });
const missing = (label: string, detail: string): Check => ({ label, state: "missing", detail });
const warning = (label: string, detail: string): Check => ({ label, state: "warning", detail });
const info = (label: string, detail: string): Check => ({ label, state: "info", detail });

const set = (name: string) => Boolean(process.env[name]?.trim());

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([p, new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`timed out after ${ms}ms`)), ms))]);
}

export { MIGRATION_MARKERS } from "./db/migrationMarkers";

export interface DatabaseFacts {
  missingMigrations: string[];
  authUsersTable: boolean;
  counts: { businesses: number; deals: number; subscribers: number } | null;
  /** Tables anyone with the public key could read or change. */
  tablesWithoutRls: string[];
  wixPhotosLeft: number | null;
}

/** What the readiness page needs to know from the database. */
export async function databaseFacts(db: Sql): Promise<DatabaseFacts> {
  const [applied] = await db.query<Record<string, boolean>>(
    `select ${MIGRATION_MARKERS.map((m, i) => `${m.sql} as m${i}`).join(", ")}, to_regclass('auth.users') is not null as auth_users`
  );
  const missingMigrations = MIGRATION_MARKERS.filter((_, i) => !applied[`m${i}`]).map((m) => m.file);
  const schemaThere = applied.m0;

  const counts = schemaThere
    ? (
        await db.query<{ businesses: string; deals: string; subscribers: string }>(
          `select (select count(*) from public.merchants) as businesses,
                  (select count(*) from public.deals) as deals,
                  (select count(*) from public.email_signups) as subscribers`
        )
      ).map((r) => ({ businesses: Number(r.businesses), deals: Number(r.deals), subscribers: Number(r.subscribers) }))[0]
    : null;

  const tablesWithoutRls = (
    await db.query<{ name: string }>(
      `select c.relname as name from pg_class c join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'public' and c.relkind in ('r', 'p') and not c.relrowsecurity order by 1`
    )
  ).map((r) => r.name);

  return {
    missingMigrations,
    authUsersTable: applied.auth_users,
    counts,
    tablesWithoutRls,
    wixPhotosLeft: schemaThere && missingMigrations.length === 0 ? await countWixPhotos(db) : null,
  };
}

async function connectionKind(): Promise<"hyperdrive" | "url" | null> {
  try {
    const { env } = await getCloudflareContext({ async: true });
    if (env.HYPERDRIVE?.connectionString) return "hyperdrive";
  } catch {
    // Not on Cloudflare.
  }
  return set("DATABASE_URL") ? "url" : null;
}

/** The nightly copy (app/api/cron/backup): a warning, never a blocker. */
async function backupCheck(): Promise<Check> {
  const bucket = await backupBucket();
  if (!bucket) return warning("Nightly backup", "No BACKUPS bucket. Create a private R2 bucket and add it to wrangler.toml as BACKUPS, so there's a copy of the data every night.");
  // No CRON_SECRET needed: the site's scheduler uses its own password
  // (lib/internalCall.ts).
  try {
    if (dataBackend() !== "postgres") {
      // Nothing to copy yet; the job only keeps the new database awake.
      // Says whether it's running, so it's known to work by switch day.
      const last = await (await getRateLimitKv())?.get(LAST_RUN_KEY).catch(() => null);
      const run = last ? (JSON.parse(last) as { at: string; result: string }) : null;
      if (!run) return info("Nightly backup", "The nightly job hasn't run yet: Cloudflare runs it each night at about 3:20am (2:20am in winter). Copies start once the database is switched on.");
      const ago = (Date.now() - new Date(run.at).getTime()) / 3_600_000;
      const said = run.result === "awake" ? "the new database answered" : "the new database didn't answer";
      return ago <= 36
        ? ok("Nightly backup", `The nightly job last ran ${ago < 1 ? "under an hour" : `${Math.round(ago)} hours`} ago (${said}). Copies start once the database is switched on.`)
        : warning("Nightly backup", `The nightly job last ran ${Math.round(ago / 24)} days ago. Cloudflare > Workers & Pages > megadeal > Settings > Trigger events should list its schedule.`);
    }
    const latest = await latestBackup(bucket);
    if (!latest) {
      return warning("Nightly backup", "No backup yet. The first is taken the night after the database is switched on (or press Save a copy of the database below).");
    }
    const hours = (Date.now() - new Date(latest.uploaded).getTime()) / 3_600_000;
    const when = hours < 1 ? "under an hour ago" : hours < 48 ? `${Math.round(hours)} hours ago` : `${Math.round(hours / 24)} days ago`;
    return hours <= 36
      ? ok("Nightly backup", `Latest copy taken ${when} (${Math.round(latest.size / 1024)} KB).`)
      : warning("Nightly backup", `The latest copy is from ${when}: the nightly job may be failing. Cloudflare > Workers & Pages > megadeal > Logs shows its runs; meanwhile, save a copy below.`);
  } catch (err) {
    console.error("[migrationReadiness] backup check failed", err);
    return warning("Nightly backup", "Couldn't look in the backup bucket just now.");
  }
}

/** A last copy of Wix to keep, before its subscription ends: a reminder, never a blocker. */
async function wixCopyCheck(): Promise<Check> {
  const bucket = await backupBucket();
  const copy = bucket ? await latestWixCopy(bucket).catch(() => null) : null;
  if (!copy) {
    return info("Copy of Wix kept", "No copy of Wix saved yet. Before ending the Wix subscription, press Save a copy of Wix below, then download it from Cloudflare > R2 to keep (the bucket deletes copies after 30 days).");
  }
  const when = new Date(copy.uploaded).toLocaleDateString("en-NZ", { timeZone: "Pacific/Auckland", dateStyle: "medium" });
  return ok("Copy of Wix kept", `A copy of Wix was saved on ${when}. Download it from Cloudflare > R2 to keep it past 30 days.`);
}

/** The hourly jobs (database watch, expired deals): that Cloudflare runs them. */
async function hourlyCheck(): Promise<Check> {
  const last = await (await getRateLimitKv())?.get(HOURLY_RUN_KEY).catch(() => null);
  let run: { at: string; database: string } | null = null;
  try {
    run = last ? JSON.parse(last) : null;
  } catch {
    run = null;
  }
  if (!run) return info("Hourly checks", "They haven't run yet: Cloudflare runs them at 17 minutes past each hour, then this shows when.");
  const minutes = Math.round((Date.now() - new Date(run.at).getTime()) / 60_000);
  const ago = minutes < 2 ? "a minute ago" : minutes < 120 ? `${minutes} minutes ago` : `${Math.round(minutes / 60)} hours ago`;
  if (minutes > 150) {
    return warning("Hourly checks", `They last ran ${ago}. Cloudflare > Workers & Pages > megadeal > Settings > Trigger events should list the schedule, and Logs shows each run.`);
  }
  return ok("Hourly checks", `Last ran ${ago}; the database ${run.database === "up" ? "answered" : "didn't answer (you'll have had an email)"}.`);
}

async function databaseSection(): Promise<{ section: Section; facts: DatabaseFacts | null }> {
  const checks: Check[] = [];
  let facts: DatabaseFacts | null = null;
  const kind = await connectionKind();

  if (!kind) {
    checks.push(missing("Connection", "No database is connected. Add the HYPERDRIVE binding to wrangler.toml, pointing at the Supabase database."));
  } else {
    checks.push(
      kind === "hyperdrive"
        ? ok("Connection", "Connected through Cloudflare Hyperdrive.")
        : (process.env.NODE_ENV === "production" ? warning : ok)(
            "Connection",
            process.env.NODE_ENV === "production"
              ? "Connected with DATABASE_URL directly. Hyperdrive is faster on Cloudflare: add the HYPERDRIVE binding."
              : "Connected with DATABASE_URL (local)."
          )
    );
    try {
      facts = await withTimeout(withDb(databaseFacts), 10_000);
      checks.push(ok("Database answers", "The database is reachable."));
    } catch (err) {
      console.error("[migrationReadiness] database check failed", err);
      checks.push(missing("Database answers", "The database didn't answer. Check the connection details and that the Supabase project is running: a free project is paused after a week without use (Supabase > the project > Restore project wakes it, data intact)."));
    }
  }

  if (facts) {
    checks.push(
      facts.missingMigrations.length
        ? missing("Tables up to date", `${facts.missingMigrations.length} update${facts.missingMigrations.length === 1 ? " hasn't" : "s haven't"} been applied: ${facts.missingMigrations.join(", ")}. Press Apply database updates below.`)
        : ok("Tables up to date", `All ${MIGRATION_MARKERS.length} updates in supabase/migrations are applied.`)
    );
    checks.push(
      facts.tablesWithoutRls.length
        ? missing("Data locked down", `Row-level security is off for: ${facts.tablesWithoutRls.join(", ")}. Anyone with the public key could read or change them. Turn it on before switching.`)
        : ok("Data locked down", "Row-level security is on for every table.")
    );
    if (facts.counts) {
      const { businesses, deals, subscribers } = facts.counts;
      checks.push(
        businesses === 0
          ? missing(
              "Data copied from Wix",
              dataBackend() === "postgres"
                ? "The database has no businesses. If it was lost, restore the latest backup below."
                : "No businesses yet. Use Import for real below (or scripts/wix-import.ts) first."
            )
          : ok("Data copied from Wix", `${businesses} business${businesses === 1 ? "" : "es"}, ${deals} deal${deals === 1 ? "" : "s"}, ${subscribers} subscriber${subscribers === 1 ? "" : "s"}. Check they match what the import found in Wix before switching.`)
      );
    }
  }

  checks.push(await backupCheck());
  if (dataBackend() === "postgres") checks.push(await hourlyCheck());
  if (dataBackend() === "postgres") checks.push(await wixCopyCheck());
  if (maintenanceOn()) {
    checks.push(warning("Changes paused", "MAINTENANCE_MODE=writes is on: businesses can't save anything. Remove it from wrangler.toml once the switch is done."));
  }

  const ready = checks.every((c) => c.state !== "missing");
  return {
    section: { id: "database", title: "Database", switchName: "DATA_BACKEND=postgres", on: dataBackend() === "postgres", ready, checks },
    facts,
  };
}

async function photosSection(dbReady: boolean, facts: DatabaseFacts | null): Promise<Section> {
  const checks: Check[] = [];
  checks.push(dbReady ? ok("Database", "Ready.") : missing("Database", "Photos move with the database: get it ready first."));
  checks.push(
    (await photoBucket())
      ? ok("Photo storage", "The PHOTOS storage bucket is connected.")
      : missing("Photo storage", "No storage bucket. Create an R2 bucket in Cloudflare and add it to wrangler.toml as PHOTOS.")
  );
  checks.push(
    (await photoResizer())
      ? ok("Smaller copies", "Cloudflare Images (the IMAGES binding) makes the sizes each page shows.")
      : warning("Smaller copies", "The IMAGES binding is missing, so photos would be sent full size: slower pages. It's in wrangler.toml; check it deployed.")
  );
  if (facts?.wixPhotosLeft != null) {
    checks.push(
      facts.wixPhotosLeft === 0
        ? ok("Photos copied", "Every photo is on MegaDeal's own storage.")
        : (photoStorage() === "r2" ? warning : info)(
            "Photos copied",
            `${facts.wixPhotosLeft} photo${facts.wixPhotosLeft === 1 ? " is" : "s are"} still on Wix. ${photoStorage() === "r2" ? "Copy them across below." : "Once photo storage is switched on, copy them across here."}`
          )
    );
  }
  return {
    id: "photos",
    title: "Photos",
    switchName: "PHOTO_STORAGE=r2",
    on: photoStorage() === "r2",
    ready: checks.every((c) => c.state !== "missing"),
    checks,
  };
}

const HOSTNAME = /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i;

/** TXT records for a name, through Cloudflare's public DNS; null if the lookup failed. */
async function txtRecords(name: string, fetchFn: Fetch): Promise<string[] | null> {
  try {
    const res = await fetchFn(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(name)}&type=TXT`, {
      headers: { Accept: "application/dns-json" },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { Answer?: { type: number; data: string }[] };
    return (json.Answer ?? []).filter((a) => a.type === 16).map((a) => a.data.replace(/"\s*"/g, "").replace(/^"|"$/g, ""));
  } catch {
    return null;
  }
}

export function fromDomain(from: string): string | null {
  const address = /<([^>]+)>/.exec(from)?.[1] ?? from;
  const domain = address.split("@")[1]?.trim().toLowerCase() ?? "";
  return HOSTNAME.test(domain) ? domain : null;
}

async function emailSection(fetchFn: Fetch): Promise<Section> {
  const checks: Check[] = [];
  const from = process.env.EMAIL_FROM || "MegaDeal <no-reply@megadeal.co.nz>";
  const domain = fromDomain(from);
  const key = process.env.RESEND_API_KEY?.trim();

  checks.push(domain ? ok("Sender", `Emails come from ${from}.`) : missing("Sender", "EMAIL_FROM isn't a valid address."));

  if (!key) {
    checks.push(missing("Resend key", "RESEND_API_KEY isn't set. Create a sending key in Resend and add it as a Cloudflare secret."));
  } else {
    // Only a full-access key can list domains; a sending-only key (the
    // safer kind for the site) is told no, which is fine.
    try {
      const res = await fetchFn("https://api.resend.com/domains", { headers: { Authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(5000) });
      const json = (await res.json().catch(() => ({}))) as { name?: string; data?: { name: string; status: string }[] };
      if (res.ok) {
        const d = json.data?.find((x) => x.name.toLowerCase() === domain);
        checks.push(ok("Resend key", "Set, and Resend accepts it."));
        checks.push(
          d?.status === "verified"
            ? ok("Domain verified", `${domain} is verified in Resend.`)
            : missing("Domain verified", d ? `${domain} is ${d.status} in Resend: add the DNS records it shows.` : `${domain} isn't added in Resend yet.`)
        );
      } else if (json.name === "restricted_api_key") {
        checks.push(ok("Resend key", "Set (a sending-only key, the safer kind)."));
        checks.push(info("Domain verified", `A sending-only key can't see this: check ${domain ?? "the domain"} shows "Verified" in Resend.`));
      } else {
        checks.push(missing("Resend key", "Resend didn't accept RESEND_API_KEY. Create a new key and update the secret."));
      }
    } catch (err) {
      console.error("[migrationReadiness] resend check failed", err);
      checks.push(warning("Resend key", "Set, but Resend couldn't be reached to check it. Try again shortly."));
    }
  }

  if (domain) {
    const [dkim, dmarc, spf] = await Promise.all([
      txtRecords(`resend._domainkey.${domain}`, fetchFn),
      txtRecords(`_dmarc.${domain}`, fetchFn),
      txtRecords(`send.${domain}`, fetchFn),
    ]);
    const dns = (label: string, records: string[] | null, test: (r: string) => boolean, good: string, bad: string, kind: typeof missing = missing) =>
      records === null ? warning(label, "Couldn't look this up just now. Try again shortly.") : records.some(test) ? ok(label, good) : kind(label, bad);
    checks.push(dns("DKIM signature", dkim, (r) => r.includes("p="), `resend._domainkey.${domain} is set.`, `No DKIM record at resend._domainkey.${domain}. Add the one Resend gives you.`));
    checks.push(dns("SPF", spf, (r) => r.startsWith("v=spf1"), `send.${domain} allows Resend to send.`, `No SPF record at send.${domain}. Add the one Resend gives you.`));
    checks.push(
      dns(
        "DMARC",
        dmarc,
        (r) => r.startsWith("v=DMARC1"),
        `_dmarc.${domain} is set.`,
        `No DMARC record at _dmarc.${domain}. Gmail and Yahoo expect one: start with "v=DMARC1; p=none; rua=mailto:<your address>".`
      )
    );
  }
  checks.push(info("Warm-up", "A new sending domain has no reputation yet. Switch on with a small volume (verification codes and notices) before any newsletter."));

  return {
    id: "email",
    title: "Email",
    switchName: "EMAIL_PROVIDER=resend",
    on: process.env.EMAIL_PROVIDER === "resend",
    ready: checks.every((c) => c.state !== "missing"),
    checks,
  };
}

async function loginsSection(dbReady: boolean, facts: DatabaseFacts | null, emailOn: boolean, emailReady: boolean, fetchFn: Fetch): Promise<Section> {
  const checks: Check[] = [];
  checks.push(dbReady ? ok("Database", "Ready.") : missing("Database", "Logins move with the database: get it ready first."));
  if (facts && !facts.authUsersTable) {
    checks.push(missing("Accounts table", "The database has no auth.users table: it must be the same Supabase project the logins use."));
  }
  checks.push(
    emailOn && emailReady
      ? ok("Email", "Sign-up codes and reset links go out from MegaDeal's own email.")
      : info("Email", "Sign-up codes and reset links go out through Wix's email until email is switched over. That works, but switch email first if you can.")
  );

  const url = process.env.SUPABASE_AUTH_URL?.trim() || process.env.SUPABASE_URL?.trim();
  const anon = set("SUPABASE_ANON_KEY");
  checks.push(url ? ok("Supabase address", "The project's address is set.") : missing("Supabase address", "SUPABASE_URL isn't set (https://<project>.supabase.co)."));
  checks.push(anon ? ok("Public key", "SUPABASE_ANON_KEY is set.") : missing("Public key", "SUPABASE_ANON_KEY isn't set (the project's anon / publishable key)."));
  checks.push(
    set("SUPABASE_SERVICE_ROLE_KEY")
      ? ok("Service key", "SUPABASE_SERVICE_ROLE_KEY is set (a secret: only ever on the server).")
      : missing("Service key", "SUPABASE_SERVICE_ROLE_KEY isn't set. It's needed to set a password from an emailed reset link.")
  );
  const hook = process.env.SEND_EMAIL_HOOK_SECRET?.trim() ?? "";
  checks.push(
    /^v1,whsec_[A-Za-z0-9+/=]{24,}$/.test(hook)
      ? ok("Email hook", "SEND_EMAIL_HOOK_SECRET is set.")
      : missing(
          "Email hook",
          hook
            ? 'SEND_EMAIL_HOOK_SECRET doesn\'t look right: it starts "v1,whsec_". Copy it again from Supabase.'
            : "SEND_EMAIL_HOOK_SECRET isn't set. In Supabase: Authentication > Hooks > Send Email, URL https://megadeal.co.nz/api/auth/email-hook, then copy its secret."
        )
  );
  // Supabase calls the hook from a data centre, which Cloudflare's bot
  // protection challenges unless a rule lets it through: then no codes.
  const reached = await (await getRateLimitKv())?.get(EMAIL_HOOK_REACHED_KEY).catch(() => null);
  checks.push(
    reached
      ? ok("Supabase gets through", `Supabase last reached the email hook ${new Date(reached).toLocaleString("en-NZ", { timeZone: "Pacific/Auckland", dateStyle: "medium", timeStyle: "short" })}, so sign-up codes get through.`)
      : info(
          "Supabase gets through",
          "Supabase hasn't reached the email hook yet. Cloudflare's bot protection stops it unless a rule lets it through: Security > WAF > Custom rules, URI Path equals /api/auth/email-hook, action Skip (guide, Stage 3). A test sign-up then shows it here."
        )
  );

  if (url && anon) {
    let base: string | null = null;
    try {
      const u = new URL(url);
      if (u.protocol === "https:" || process.env.NODE_ENV !== "production") base = process.env.SUPABASE_AUTH_URL ? url.replace(/\/$/, "") : `${u.origin}/auth/v1`;
    } catch {
      // Reported below.
    }
    if (!base) {
      checks.push(missing("Supabase answers", "SUPABASE_URL isn't a valid https address."));
    } else {
      try {
        const res = await fetchFn(`${base}/settings`, {
          headers: { apikey: process.env.SUPABASE_ANON_KEY!.trim() },
          signal: AbortSignal.timeout(5000),
        });
        if (!res.ok) throw new Error(`settings answered ${res.status}`);
        const s = (await res.json()) as { disable_signup?: boolean; mailer_autoconfirm?: boolean; external?: { email?: boolean } };
        checks.push(ok("Supabase answers", "The login service is reachable and accepts the public key."));
        if (s.external?.email === false) checks.push(missing("Email sign-in", "Email sign-in is turned off in Supabase (Authentication > Providers > Email)."));
        if (s.disable_signup) checks.push(missing("New sign-ups", 'Sign-ups are turned off in Supabase: turn "Allow new users to sign up" on.'));
        checks.push(
          s.mailer_autoconfirm
            ? missing("Email codes required", 'Supabase lets accounts in without the emailed code: turn "Confirm email" on (Authentication > Providers > Email).')
            : ok("Email codes required", "Every new account has to enter the emailed code.")
        );
      } catch (err) {
        console.error("[migrationReadiness] supabase check failed", err);
        checks.push(missing("Supabase answers", "The login service didn't answer, or refused the public key. Check SUPABASE_URL and SUPABASE_ANON_KEY."));
      }

      // The service key is only used when a business sets a password, so a
      // mis-pasted one would otherwise first show then. Asks for one
      // account (read, never shown): Supabase only answers the real key.
      const service = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
      if (service) {
        try {
          const headers: Record<string, string> = { apikey: service };
          if (isJwtKey(service)) headers.Authorization = `Bearer ${service}`;
          const res = await fetchFn(`${base}/admin/users?page=1&per_page=1`, { headers, signal: AbortSignal.timeout(5000) });
          checks.push(
            res.ok
              ? ok("Service key works", "Supabase accepts SUPABASE_SERVICE_ROLE_KEY.")
              : res.status === 401 || res.status === 403
                ? missing("Service key works", "Supabase refused SUPABASE_SERVICE_ROLE_KEY. Copy the secret key again (Supabase > Project Settings > API Keys) and replace it in Cloudflare.")
                : warning("Service key works", `Supabase answered ${res.status} when checking SUPABASE_SERVICE_ROLE_KEY. Try again shortly.`)
          );
        } catch (err) {
          console.error("[migrationReadiness] service key check failed", err);
          checks.push(warning("Service key works", "Couldn't reach Supabase to check SUPABASE_SERVICE_ROLE_KEY. Try again shortly."));
        }
      }

      if (set("SUPABASE_JWT_SECRET")) {
        checks.push(ok("Token checking", "Sign-ins are checked with SUPABASE_JWT_SECRET."));
      } else {
        try {
          const res = await fetchFn(`${base}/.well-known/jwks.json`, { signal: AbortSignal.timeout(5000) });
          const keys = res.ok ? ((await res.json()) as { keys?: unknown[] }).keys ?? [] : [];
          checks.push(
            keys.length
              ? ok("Token checking", "Sign-ins are checked with the project's published signing keys.")
              : missing("Token checking", "The project publishes no signing keys: set SUPABASE_JWT_SECRET (Settings > API > JWT secret).")
          );
        } catch {
          checks.push(missing("Token checking", "Couldn't fetch the project's signing keys: set SUPABASE_JWT_SECRET instead."));
        }
      }
    }
  }

  // The robot check: Cloudflare says whether the secret is real when
  // given a token that isn't, without counting it as a check.
  // Written out in full, not looked up by name with set(): a NEXT_PUBLIC_
  // value is a build setting, copied into the code where it's written
  // out, and isn't among the settings the running site can look up. By
  // name it read as missing although the pages had it.
  const siteKey = Boolean(process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim());
  const secret = process.env.TURNSTILE_SECRET_KEY?.trim();
  if (!siteKey || !secret) {
    checks.push(missing("Robot check", `${!siteKey ? "NEXT_PUBLIC_TURNSTILE_SITE_KEY" : "TURNSTILE_SECRET_KEY"} isn't set. Create a Turnstile widget for megadeal.co.nz in Cloudflare.`));
  } else {
    try {
      const res = await fetchFn("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
        method: "POST",
        body: new URLSearchParams({ secret, response: "readiness-check" }),
        signal: AbortSignal.timeout(5000),
      });
      const out = (await res.json().catch(() => ({}))) as { "error-codes"?: string[] };
      checks.push(
        out["error-codes"]?.includes("invalid-input-secret")
          ? missing("Robot check", "Cloudflare doesn't recognise TURNSTILE_SECRET_KEY. Copy it again from the Turnstile widget.")
          : ok("Robot check", "Turnstile keys are set and the secret is recognised.")
      );
    } catch {
      checks.push(warning("Robot check", "Keys are set, but Cloudflare couldn't be reached to check the secret."));
    }
  }
  if (process.env.TURNSTILE_DISABLED === "1") {
    checks.push(warning("Robot check off", "TURNSTILE_DISABLED=1 is set. It only works away from the live site, but remove it from the live settings."));
  }

  checks.push(
    (await getRateLimitKv())
      ? ok("Attempt limits", "The RATE_LIMIT_KV store is connected: repeated sign-in attempts are slowed down.")
      : missing("Attempt limits", "The RATE_LIMIT_KV binding is missing, so sign-in attempts aren't limited.")
  );
  checks.push(info("Existing businesses", "Wix passwords can't be copied, so each business sets a new password once, from an emailed link. Once this is switched on, send the links with the button below."));

  return {
    id: "logins",
    title: "Business logins",
    switchName: "AUTH_BACKEND=supabase",
    on: authBackend() === "supabase",
    ready: checks.every((c) => c.state !== "missing"),
    checks,
  };
}

/** Every check, run now. */
export async function checkReadiness(fetchFn: Fetch = fetch): Promise<Readiness> {
  const { section: database, facts } = await databaseSection();
  const [photos, email] = await Promise.all([photosSection(database.ready, facts), emailSection(fetchFn)]);
  const logins = await loginsSection(database.ready, facts, email.on, email.ready, fetchFn);
  return { checkedAt: new Date().toISOString(), sections: [database, photos, email, logins], wixPhotosLeft: facts?.wixPhotosLeft ?? null };
}
