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
