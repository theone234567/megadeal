import { generateDealCode } from "../dealCode";
import { memorableCandidate } from "../memorableCode";
import { withDb, type Sql } from "./connection";

/**
 * A new deal code that no other deal has (lib/memorableCode.ts). Each code
 * is claimed in public.deal_codes (20261020000000_deal_codes.sql), whose
 * key makes two deals made at the same moment unable to get the same one:
 * the second simply tries another. Two letters first, then three, then
 * four, so a word never runs out.
 */
export async function reserveDealCode(db: Sql, category: string | null | undefined, random: () => number = Math.random): Promise<string> {
  for (let attempt = 0; attempt < 18; attempt++) {
    const code = memorableCandidate(category, attempt < 6 ? 2 : attempt < 12 ? 3 : 4, random);
    const rows = await db.query<{ code: string }>(
      `insert into public.deal_codes (code)
       select $1 where not exists (select 1 from public.deals where upper(deal_code) = $1)
       on conflict do nothing returning code`,
      [code],
    );
    if (rows.length > 0) return rows[0].code;
  }
  throw new Error("No free deal code found");
}

/** A new code for a deal, or an old-style MEGA- one if the database can't
 *  be reached or hasn't had the update yet: a deal is never held up for it. */
export async function newDealCode(category: string | null | undefined): Promise<string> {
  try {
    return await withDb((db) => reserveDealCode(db, category));
  } catch (err) {
    console.warn("[dealCodes] using an old-style code:", (err as Error)?.message);
    return generateDealCode();
  }
}
