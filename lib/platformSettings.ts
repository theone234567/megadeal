import "server-only";
import { getRateLimitKv, type MinimalKVNamespace } from "./rateLimit";
import {
  DEFAULT_PLATFORM_SETTINGS,
  diffPlatformSettings,
  parsePlatformSettings,
  type PlatformSettings,
  type SettingChange,
} from "./platformSettingsRules";

/**
 * Where the platform settings live: the Workers KV namespace the app
 * already has (RATE_LIMIT_KV), under their own keys. One record holds the
 * current settings and a version number; a second holds the change
 * history. Nothing in Wix changes.
 *
 * KV is eventually consistent: a save is visible at once where it was
 * made and everywhere within about a minute. Fine for admin switches.
 * Writes check the version first, so two admins saving at once can't
 * silently overwrite each other (the one that's out of date is told to
 * reload); with one admin that race is practically impossible anyway.
 *
 * Without a KV binding the defaults are used and saving is refused
 * (`next dev` gets a local emulated namespace from Wrangler, kept in
 * .wrangler/state, never the live one). With one, a read that fails
 * throws: callers that gate a submission turn that into "try again
 * shortly" rather than guessing.
 */

const SETTINGS_KEY = "platform-settings:v1";
const HISTORY_KEY = "platform-settings:history";
const HISTORY_LIMIT = 50;

export interface StoredPlatformSettings {
  version: number;
  settings: PlatformSettings;
  updatedAt: string | null;
  /** True when nothing has been saved yet and these are the defaults. */
  isDefault: boolean;
}

export interface SettingsHistoryEntry {
  version: number;
  at: string;
  by: string;
  changes: SettingChange[];
}

async function kv(): Promise<MinimalKVNamespace | null> {
  return getRateLimitKv();
}

function fromRaw(raw: string | null): StoredPlatformSettings {
  if (!raw) return { version: 0, settings: DEFAULT_PLATFORM_SETTINGS, updatedAt: null, isDefault: true };
  const parsed = JSON.parse(raw) as { version?: unknown; settings?: unknown; updatedAt?: unknown };
  // Re-checked on the way out too: a key added later falls back to its
  // default, and a bad stored value can't reach the enforcement code.
  const { settings } = parsePlatformSettings(parsed.settings);
  return {
    version: typeof parsed.version === "number" ? parsed.version : 0,
    settings,
    updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : null,
    isDefault: false,
  };
}

export async function getPlatformSettings(): Promise<StoredPlatformSettings> {
  const store = await kv();
  if (!store) return fromRaw(null);
  return fromRaw(await store.get(SETTINGS_KEY));
}

export async function getSettingsHistory(): Promise<SettingsHistoryEntry[]> {
  const store = await kv();
  if (!store) return [];
  const raw = await store.get(HISTORY_KEY);
  if (!raw) return [];
  try {
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export type SaveResult =
  | { ok: true; stored: StoredPlatformSettings; changes: SettingChange[] }
  | { ok: false; status: 400 | 409 | 503; error: string; errors?: string[] };

/** Saves admin changes over the current settings. `expectedVersion` is the
 *  version the admin's page loaded; anything else means someone saved in
 *  between, and nothing is written. */
export async function savePlatformSettings(
  input: unknown,
  expectedVersion: unknown,
  by: string,
): Promise<SaveResult> {
  const store = await kv();
  if (!store) return { ok: false, status: 503, error: "Settings storage isn't available here." };

  const current = fromRaw(await store.get(SETTINGS_KEY));
  if (expectedVersion !== current.version) {
    return {
      ok: false,
      status: 409,
      error: "These settings were changed since you opened them. Reload to see the latest, then make your change again.",
    };
  }
  const { settings, errors } = parsePlatformSettings(input, current.settings);
  if (errors.length > 0) return { ok: false, status: 400, error: errors[0], errors };

  const changes = diffPlatformSettings(current.settings, settings);
  if (changes.length === 0) return { ok: true, stored: current, changes };

  const at = new Date().toISOString();
  const next = { version: current.version + 1, settings, updatedAt: at };
  await store.put(SETTINGS_KEY, JSON.stringify(next));

  const history = await getSettingsHistory();
  history.unshift({ version: next.version, at, by, changes });
  await store.put(HISTORY_KEY, JSON.stringify(history.slice(0, HISTORY_LIMIT)));

  return { ok: true, stored: { ...next, isDefault: false }, changes };
}
