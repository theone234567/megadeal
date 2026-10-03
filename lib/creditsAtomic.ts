import "server-only";

/**
 * Atomic server-side increment of a Merchants record's creditsBalance —
 * safe under concurrent writers (e.g. a referral bonus landing at the same
 * moment as a deal-credit debit), unlike a get-then-update in application
 * code which can lose an update if two requests read the same starting
 * balance. Pass a negative amount to debit.
 */
export async function incrementCreditsAtomically(
  adminClient: any,
  merchantId: string,
  amount: number
): Promise<boolean> {
  try {
    const res = await adminClient.fetchWithAuth(
      `https://www.wixapis.com/wix-data/v2/items/${merchantId}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dataCollectionId: "Merchants",
          patch: {
            dataItemId: merchantId,
            fieldModifications: [
              { fieldPath: "creditsBalance", action: "INCREMENT_FIELD", incrementFieldOptions: { value: amount } },
            ],
          },
        }),
      }
    );
    if (!res.ok) {
      // A rejected increment used to be indistinguishable from a successful
      // one at every call site: the deal-creation debit is wrapped in a
      // try/catch, but nothing here throws, so a refused debit meant a free
      // deal and an untouched balance with no trace of either. Callers now
      // act on the boolean; this makes the reason findable when they do.
      const body = await res.text().catch(() => "");
      console.error(
        `[credits] increment of ${amount} on merchant ${merchantId} rejected (${res.status})`,
        body.slice(0, 500)
      );
      return false;
    }
    return true;
  } catch (err) {
    console.error(`[credits] increment of ${amount} on merchant ${merchantId} threw`, err);
    return false;
  }
}

/**
 * Adds `amount` to one or more numeric fields of a Wix Data item in place, without
 * reading and re-saving the whole item. Returns false on failure; never
 * throws.
 */
export async function incrementFieldAtomically(
  adminClient: any,
  collection: string,
  itemId: string,
  field: string | string[],
  amount: number
): Promise<boolean> {
  const fields = Array.isArray(field) ? field : [field];
  try {
    const res = await adminClient.fetchWithAuth(`https://www.wixapis.com/wix-data/v2/items/${itemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        dataCollectionId: collection,
        patch: {
          dataItemId: itemId,
          fieldModifications: fields.map((f) => ({ fieldPath: f, action: "INCREMENT_FIELD", incrementFieldOptions: { value: amount } })),
        },
      }),
    });
    if (!res.ok) {
      console.error(`[incrementField] ${collection}.${fields.join(",")} on ${itemId} rejected (${res.status})`);
      return false;
    }
    return true;
  } catch (err) {
    console.error(`[incrementField] ${collection}.${fields.join(",")} on ${itemId} threw`, err);
    return false;
  }
}

type PatchModification =
  | { fieldPath: string; action: "SET_FIELD"; setFieldOptions: { value: string | number | boolean } }
  | { fieldPath: string; action: "INCREMENT_FIELD"; incrementFieldOptions: { value: number } };

/** One conditional Wix Data patch. `filter` is the condition: the change
 *  is only made if the item still matches it, so the check and the write
 *  are one step on Wix's side. A mismatch is refused with 428 (WDE0193);
 *  a success returns the updated item. */
async function conditionalPatch(
  adminClient: any,
  collection: string,
  itemId: string,
  fieldModifications: PatchModification[],
  filter: Record<string, unknown>,
): Promise<{ ok: true; data: Record<string, any> } | { ok: false; status: number }> {
  try {
    const res = await adminClient.fetchWithAuth(`https://www.wixapis.com/wix-data/v2/items/${itemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        dataCollectionId: collection,
        patch: { dataItemId: itemId, fieldModifications },
        condition: { filter },
      }),
    });
    if (!res.ok) return { ok: false, status: res.status };
    const json = await res.json().catch(() => null);
    return { ok: true, data: json?.dataItem?.data ?? {} };
  } catch (err) {
    console.error(`[conditionalPatch] ${collection} ${itemId} threw`, err);
    return { ok: false, status: 0 };
  }
}

/**
 * Takes `amount` credits only if the balance covers them, in one step:
 * two submissions arriving together can't both pass a balance check and
 * then both debit (4 credits, two 4-credit deals, balance −4).
 *
 * "insufficient": nothing taken. "error": nothing taken as far as we can
 * tell (the balance still covers it, so the write itself failed).
 * Never throws.
 */
export async function debitCreditsIfAvailable(
  adminClient: any,
  merchantId: string,
  amount: number,
): Promise<"debited" | "insufficient" | "error"> {
  const res = await conditionalPatch(
    adminClient,
    "Merchants",
    merchantId,
    [{ fieldPath: "creditsBalance", action: "INCREMENT_FIELD", incrementFieldOptions: { value: -amount } }],
    { creditsBalance: { $gte: amount } },
  );
  if (res.ok) {
    // Belt and braces: if the condition were ever not applied, a balance
    // below zero is put straight back and the submission refused.
    const balance = Number(res.data.creditsBalance);
    if (Number.isFinite(balance) && balance < 0) {
      const restored = await incrementCreditsAtomically(adminClient, merchantId, amount);
      if (!restored) console.error(`[credits] OVERDRAWN merchant ${merchantId} by ${-balance}; restore of ${amount} failed`);
      return "insufficient";
    }
    return "debited";
  }
  // Wix answers 428 (WDE0193 "Update condition not met") when the balance
  // didn't cover it. Anything else is read from the balance itself.
  if (res.status === 428) return "insufficient";
  try {
    const merchant = await adminClient.items.get("Merchants", merchantId);
    if ((Number(merchant?.creditsBalance) || 0) < amount) return "insufficient";
  } catch (err) {
    console.error(`[credits] balance re-read for ${merchantId} failed`, err);
  }
  console.error(`[credits] debit of ${amount} on merchant ${merchantId} failed (${res.status})`);
  return "error";
}

/**
 * Sets fields on an item only while it still matches `filter` — e.g. moves
 * a deal from "Pending Approval" to "Cancelled" only if no other request
 * has already. Returns the updated item's data, or null if the item no
 * longer matched (or the write failed). Never throws.
 */
export async function setFieldsIf(
  adminClient: any,
  collection: string,
  itemId: string,
  fields: Record<string, string | number | boolean>,
  filter: Record<string, unknown>,
): Promise<Record<string, any> | null> {
  const res = await conditionalPatch(
    adminClient,
    collection,
    itemId,
    Object.entries(fields).map(([fieldPath, value]) => ({ fieldPath, action: "SET_FIELD" as const, setFieldOptions: { value } })),
    filter,
  );
  return res.ok ? res.data : null;
}
