import "server-only";
import { getRateLimitKv } from "./rateLimit";
import {
  TEST_DEAL_LIMIT,
  parseTestDealInput,
  readStoredTestDeals,
  type TestDeal,
} from "./testDeals";

/**
 * Where admin test deals live (lib/testDeals.ts): the same Workers KV
 * namespace as the platform settings, under their own key, as one list.
 * Nothing in Wix, so no public read can ever find one.
 *
 * One admin edits these, so a plain read-modify-write is enough; two
 * saves in the same instant would keep the later one. KV is eventually
 * consistent: a change shows at once where it was made, everywhere else
 * within about a minute. `next dev` uses Wrangler's local emulated
 * namespace, never the live one.
 */

const KEY = "admin-test-deals:v1";

export type TestDealResult =
  | { ok: true; deal: TestDeal }
  | { ok: false; status: 400 | 404 | 409 | 503; error: string };

async function store() {
  return getRateLimitKv();
}

export async function listTestDeals(): Promise<TestDeal[]> {
  const kv = await store();
  if (!kv) return [];
  const raw = await kv.get(KEY);
  if (!raw) return [];
  try {
    return readStoredTestDeals(JSON.parse(raw));
  } catch {
    return [];
  }
}

export async function getTestDeal(id: string): Promise<TestDeal | null> {
  return (await listTestDeals()).find((t) => t.id === id) ?? null;
}

async function write(list: TestDeal[]) {
  const kv = await store();
  if (!kv) throw new Error("no KV");
  await kv.put(KEY, JSON.stringify(list));
}

const UNAVAILABLE = { ok: false as const, status: 503 as const, error: "Test deal storage isn't available here." };

export async function createTestDeal(input: unknown): Promise<TestDealResult> {
  if (!(await store())) return UNAVAILABLE;
  const { fields, error } = parseTestDealInput(input);
  if (!fields) return { ok: false, status: 400, error: error ?? "Check the deal's details." };
  const list = await listTestDeals();
  if (list.length >= TEST_DEAL_LIMIT) {
    return { ok: false, status: 409, error: `You can keep up to ${TEST_DEAL_LIMIT} test deals. Delete one to add another.` };
  }
  const at = new Date().toISOString();
  const deal: TestDeal = { ...fields, id: crypto.randomUUID(), createdAt: at, updatedAt: at, startedAt: at };
  await write([deal, ...list]);
  return { ok: true, deal };
}

/** Saves edits. The timer keeps running from when it last started; a
 *  changed run length takes effect from that same start. */
export async function updateTestDeal(id: string, input: unknown): Promise<TestDealResult> {
  if (!(await store())) return UNAVAILABLE;
  const list = await listTestDeals();
  const current = list.find((t) => t.id === id);
  if (!current) return { ok: false, status: 404, error: "That test deal no longer exists." };
  const { fields, error } = parseTestDealInput(input);
  if (!fields) return { ok: false, status: 400, error: error ?? "Check the deal's details." };
  const deal: TestDeal = { ...current, ...fields, updatedAt: new Date().toISOString() };
  await write(list.map((t) => (t.id === id ? deal : t)));
  return { ok: true, deal };
}

/** Starts the timer again from now. Touches only this test deal. */
export async function restartTestDeal(id: string): Promise<TestDealResult> {
  if (!(await store())) return UNAVAILABLE;
  const list = await listTestDeals();
  const current = list.find((t) => t.id === id);
  if (!current) return { ok: false, status: 404, error: "That test deal no longer exists." };
  const at = new Date().toISOString();
  const deal: TestDeal = { ...current, startedAt: at, updatedAt: at };
  await write(list.map((t) => (t.id === id ? deal : t)));
  return { ok: true, deal };
}

export async function deleteTestDeal(id: string): Promise<boolean> {
  if (!(await store())) return false;
  const list = await listTestDeals();
  if (!list.some((t) => t.id === id)) return false;
  await write(list.filter((t) => t.id !== id));
  return true;
}
