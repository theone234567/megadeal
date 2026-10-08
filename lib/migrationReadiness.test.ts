import { readdirSync } from "fs";
import { join } from "path";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { createTestDb } from "./db/testDb";
import type { Sql } from "./db/sql";

vi.mock("server-only", () => ({}));
let cfEnv: Record<string, unknown> = {};
vi.mock("@opennextjs/cloudflare", () => ({ getCloudflareContext: async () => ({ env: cfEnv }) }));
let lastBackupRun: string | null = null;
vi.mock("./rateLimit", () => ({ getRateLimitKv: async () => ({ get: async (k: string) => (k === "cron:backup:last" ? lastBackupRun : null), put: async () => {} }) }));

let pglite: PGlite;
const sqlFor = (db: PGlite): Sql => ({ query: async (text, params) => (await db.query(text, params as any[])).rows as any[] });

vi.mock("./db/connection", async (orig) => ({
  ...(await orig<typeof import("./db/connection")>()),
  withDb: async (fn: (db: Sql) => unknown) => fn(sqlFor(pglite)),
}));

const { MIGRATION_MARKERS, databaseFacts, checkReadiness, fromDomain } = await import("./migrationReadiness");

beforeAll(async () => {
  pglite = (await createTestDb()).db;
});

afterEach(() => {
  vi.unstubAllEnvs();
  cfEnv = {};
});

describe("database facts", () => {
  it("has a marker for every migration", () => {
    const files = readdirSync(join(process.cwd(), "supabase/migrations")).filter((f) => f.endsWith(".sql")).sort();
    expect(MIGRATION_MARKERS.map((m) => m.file)).toEqual(files);
  });

  it("sees a fully updated, locked-down database", async () => {
    const facts = await databaseFacts(sqlFor(pglite));
    expect(facts.missingMigrations).toEqual([]);
    expect(facts.tablesWithoutRls).toEqual([]);
    expect(facts.authUsersTable).toBe(true);
    expect(facts.counts).toEqual({ businesses: 0, deals: 0, subscribers: 0 });
    expect(facts.wixPhotosLeft).toBe(0);
  });

  it("names a missing update and a table left open", async () => {
    const db = (await createTestDb()).db;
    await db.exec("alter table public.email_signups drop column old_unsubscribe_token_hashes; alter table public.deals disable row level security;");
    const facts = await databaseFacts(sqlFor(db));
    expect(facts.missingMigrations).toEqual(["20261011000000_unsubscribe_links.sql"]);
    expect(facts.tablesWithoutRls).toEqual(["deals"]);
    expect(facts.wixPhotosLeft).toBeNull();
    await db.close();
  });
});

describe("fromDomain", () => {
  it("reads the sending domain", () => {
    expect(fromDomain("MegaDeal <no-reply@megadeal.co.nz>")).toBe("megadeal.co.nz");
    expect(fromDomain("hello@Mail.Example.com")).toBe("mail.example.com");
    expect(fromDomain("nobody")).toBeNull();
    expect(fromDomain("x@evil.com/path?")).toBeNull();
  });
});

/** Answers the outside services the checks call. */
function services(over: Partial<Record<"resend" | "settings" | "turnstile" | "dns", (url: string) => Response>> = {}) {
  const calls: string[] = [];
  const fetchFn = (async (input: string | URL | Request) => {
    const url = String(input);
    calls.push(url);
    if (url.startsWith("https://api.resend.com/")) return over.resend?.(url) ?? Response.json({ name: "restricted_api_key" }, { status: 401 });
    if (url.endsWith("/settings")) return over.settings?.(url) ?? Response.json({ external: { email: true }, disable_signup: false, mailer_autoconfirm: false });
    if (url.includes("turnstile")) return over.turnstile?.(url) ?? Response.json({ success: false, "error-codes": ["invalid-input-response"] });
    if (url.startsWith("https://cloudflare-dns.com/")) {
      if (over.dns) return over.dns(url);
      const name = new URL(url).searchParams.get("name")!;
      const data = name.startsWith("resend._domainkey") ? "p=MIGf" : name.startsWith("_dmarc") ? "v=DMARC1; p=none" : "v=spf1 include:amazonses.com ~all";
      return Response.json({ Answer: [{ type: 16, data: `"${data}"` }] });
    }
    throw new Error(`unexpected ${url}`);
  }) as typeof fetch;
  return { fetchFn, calls };
}

function allSet() {
  vi.stubEnv("DATABASE_URL", "postgres://local");
  vi.stubEnv("RESEND_API_KEY", "re_secret_value");
  vi.stubEnv("SUPABASE_URL", "https://abc.supabase.co");
  vi.stubEnv("SUPABASE_ANON_KEY", "anon");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service_secret_value");
  vi.stubEnv("SUPABASE_JWT_SECRET", "jwt_secret_value");
  vi.stubEnv("SEND_EMAIL_HOOK_SECRET", "v1,whsec_c2VjcmV0c2VjcmV0c2VjcmV0c2VjcmV0");
  vi.stubEnv("NEXT_PUBLIC_TURNSTILE_SITE_KEY", "0x4AAA");
  vi.stubEnv("TURNSTILE_SECRET_KEY", "0x4AAA_secret_value");
}

const section = (r: Awaited<ReturnType<typeof checkReadiness>>, id: string) => r.sections.find((s) => s.id === id)!;
const check = (r: Awaited<ReturnType<typeof checkReadiness>>, id: string, label: string) => section(r, id).checks.find((c) => c.label === label);

describe("checkReadiness", () => {
  it("with nothing set up, says what's needed and calls nobody but DNS", async () => {
    vi.stubEnv("DATABASE_URL", "");
    vi.stubEnv("RESEND_API_KEY", "");
    vi.stubEnv("SUPABASE_URL", "");
    vi.stubEnv("SUPABASE_ANON_KEY", "");
    vi.stubEnv("TURNSTILE_SECRET_KEY", "");
    const { fetchFn, calls } = services();
    const r = await checkReadiness(fetchFn);
    expect(r.sections.map((s) => [s.id, s.on, s.ready])).toEqual([
      ["database", false, false],
      ["photos", false, false],
      ["email", false, false],
      ["logins", false, false],
    ]);
    expect(check(r, "database", "Connection")?.state).toBe("missing");
    expect(check(r, "email", "Resend key")?.state).toBe("missing");
    expect(calls.every((u) => u.startsWith("https://cloudflare-dns.com/"))).toBe(true);
  });

  it("with everything set up, only the import and the photo bucket are left", async () => {
    allSet();
    const r = await checkReadiness(services().fetchFn);
    // Nothing is imported into the test database.
    // (and, with no bucket here, the nightly backup: a warning, not a blocker)
    expect(section(r, "database").checks.filter((c) => c.state !== "ok").map((c) => [c.label, c.state])).toEqual([
      ["Data copied from Wix", "missing"],
      ["Nightly backup", "warning"],
    ]);
    expect(section(r, "email").ready).toBe(true);
    expect(check(r, "photos", "Photo storage")?.state).toBe("missing");
    expect(check(r, "logins", "Email codes required")?.state).toBe("ok");
    expect(check(r, "logins", "Robot check")?.state).toBe("ok");
  });

  it("never puts a secret in the report", async () => {
    allSet();
    const text = JSON.stringify(await checkReadiness(services().fetchFn));
    for (const secret of ["re_secret_value", "service_secret_value", "jwt_secret_value", "c2VjcmV0c2Vj", "0x4AAA_secret_value", "postgres://local"]) {
      expect(text).not.toContain(secret);
    }
  });

  it("flags a Supabase project that lets accounts in without the emailed code", async () => {
    allSet();
    const r = await checkReadiness(services({ settings: () => Response.json({ external: { email: true }, mailer_autoconfirm: true }) }).fetchFn);
    expect(check(r, "logins", "Email codes required")?.state).toBe("missing");
    expect(section(r, "logins").ready).toBe(false);
  });

  it("flags a Turnstile secret Cloudflare doesn't know, and a malformed hook secret", async () => {
    allSet();
    vi.stubEnv("SEND_EMAIL_HOOK_SECRET", "whsec_short");
    const r = await checkReadiness(services({ turnstile: () => Response.json({ success: false, "error-codes": ["invalid-input-secret"] }) }).fetchFn);
    expect(check(r, "logins", "Robot check")?.state).toBe("missing");
    expect(check(r, "logins", "Email hook")?.state).toBe("missing");
    expect(check(r, "logins", "Email hook")?.detail).not.toContain("whsec_short");
  });

  it("reads Resend's domain status with a full-access key, and missing DNS records", async () => {
    allSet();
    const r = await checkReadiness(
      services({
        resend: () => Response.json({ data: [{ name: "megadeal.co.nz", status: "pending" }] }),
        dns: () => Response.json({ Answer: [] }),
      }).fetchFn
    );
    expect(check(r, "email", "Domain verified")?.state).toBe("missing");
    expect(check(r, "email", "DMARC")?.state).toBe("missing");
    expect(check(r, "email", "DKIM signature")?.state).toBe("missing");
    expect(section(r, "email").ready).toBe(false);
  });

  it("a database that doesn't answer is a plain sentence, not its error", async () => {
    allSet();
    const real = pglite;
    pglite = { query: async () => { throw new Error("connect ECONNREFUSED db.secret-host:5432 user=postgres"); } } as unknown as PGlite;
    try {
      const r = await checkReadiness(services().fetchFn);
      expect(check(r, "database", "Database answers")?.state).toBe("missing");
      expect(JSON.stringify(r)).not.toContain("secret-host");
    } finally {
      pglite = real;
    }
  });
});

describe("the nightly backup check", () => {
  const bucketWith = (...ages: number[]) => ({
    put: async () => {},
    list: async () => ({
      objects: ages.map((h) => {
        const at = new Date(Date.now() - h * 3_600_000);
        return { key: `backups/${at.toISOString()}.json.gz`, uploaded: at, size: 20_480 };
      }),
      truncated: false,
    }),
  });

  it("is fine with a copy from last night, and says when", async () => {
    allSet();
    vi.stubEnv("CRON_SECRET", "s");
    vi.stubEnv("DATA_BACKEND", "postgres");
    cfEnv = { BACKUPS: bucketWith(50, 26, 3) };
    const c = check(await checkReadiness(services().fetchFn), "database", "Nightly backup");
    expect(c).toMatchObject({ state: "ok", detail: "Latest copy taken 3 hours ago (20 KB)." });
  });

  it("warns when the latest copy is old: the job may be failing", async () => {
    allSet();
    vi.stubEnv("CRON_SECRET", "s");
    vi.stubEnv("DATA_BACKEND", "postgres");
    cfEnv = { BACKUPS: bucketWith(80) };
    const c = check(await checkReadiness(services().fetchFn), "database", "Nightly backup");
    expect(c?.state).toBe("warning");
    expect(c?.detail).toContain("3 days ago");
  });

  it("doesn't need CRON_SECRET: the site's scheduler has its own password", async () => {
    allSet();
    vi.stubEnv("CRON_SECRET", "");
    cfEnv = { BACKUPS: bucketWith(3) };
    const c = check(await checkReadiness(services().fetchFn), "database", "Nightly backup");
    expect(c?.detail).not.toContain("CRON_SECRET");
  });

  it("after the switch, reminds to keep a copy of Wix", async () => {
    allSet();
    vi.stubEnv("CRON_SECRET", "s");
    vi.stubEnv("DATA_BACKEND", "postgres");
    const objects: { key: string; uploaded: Date; size: number }[] = [];
    cfEnv = { BACKUPS: { put: async () => {}, list: async ({ prefix }: { prefix: string }) => ({ objects: objects.filter((o) => o.key.startsWith(prefix)), truncated: false }) } };
    expect(check(await checkReadiness(services().fetchFn), "database", "Copy of Wix kept")).toMatchObject({ state: "info", detail: expect.stringContaining("Save a copy of Wix") });
    objects.push({ key: "wix-copies/2026-10-20T01-00-00Z.json.gz", uploaded: new Date("2026-10-20T01:00:00Z"), size: 50_000 });
    expect(check(await checkReadiness(services().fetchFn), "database", "Copy of Wix kept")).toMatchObject({ state: "ok", detail: expect.stringContaining("20 Oct 2026") });
  });

  it("before the switch, says whether the nightly job is running", async () => {
    allSet();
    vi.stubEnv("CRON_SECRET", "s");
    vi.stubEnv("DATA_BACKEND", "wix");
    cfEnv = { BACKUPS: bucketWith() };
    lastBackupRun = null;
    expect(check(await checkReadiness(services().fetchFn), "database", "Nightly backup")).toMatchObject({ state: "info", detail: expect.stringContaining("hasn't run yet") });

    lastBackupRun = JSON.stringify({ at: new Date(Date.now() - 5 * 3_600_000).toISOString(), result: "awake" });
    expect(check(await checkReadiness(services().fetchFn), "database", "Nightly backup")).toMatchObject({
      state: "ok",
      detail: expect.stringContaining("last ran 5 hours ago (the new database answered)"),
    });

    lastBackupRun = JSON.stringify({ at: new Date(Date.now() - 4 * 86_400_000).toISOString(), result: "awake" });
    expect(check(await checkReadiness(services().fetchFn), "database", "Nightly backup")?.state).toBe("warning");
    lastBackupRun = null;
  });
});
