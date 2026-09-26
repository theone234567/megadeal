/**
 * Whether the automatic review holds back swearing, crude humour and rude
 * gestures. On by default for the whole site; an admin can turn it off
 * site-wide, or override it for one business (say a bar whose name or
 * style is deliberately cheeky).
 *
 * Only rudeness is switchable. Hate speech and slurs, sexual content,
 * violence, illegal offers and attempts to game the reviewer are always
 * checked, whatever these settings say.
 */

export type RudenessOverride = "default" | "on" | "off";

export const RUDENESS_OVERRIDES: { value: RudenessOverride; label: string }[] = [
  { value: "default", label: "Use the site setting" },
  { value: "on", label: "Always check" },
  { value: "off", label: "Don't check" },
];

const SETTING_KEY = "rudenessCheck";

export function parseRudenessOverride(value: unknown): RudenessOverride {
  return value === "on" || value === "off" ? value : "default";
}

/** The effective setting for one business. */
export function rudenessCheckApplies(siteWide: boolean, override: unknown): boolean {
  const o = parseRudenessOverride(override);
  return o === "default" ? siteWide : o === "on";
}

/** The site-wide setting. Anything unreadable counts as on — the safe
 *  default for a family-friendly site. */
export async function getSiteRudenessCheck(adminClient: any): Promise<boolean> {
  try {
    const res = await adminClient.items.query("SiteSettings").eq("key", SETTING_KEY).limit(1).find();
    return res.items?.[0]?.value !== "off";
  } catch (err) {
    console.error("[rudenessSetting] read failed", err);
    return true;
  }
}

export async function setSiteRudenessCheck(adminClient: any, on: boolean): Promise<void> {
  const res = await adminClient.items.query("SiteSettings").eq("key", SETTING_KEY).limit(1).find();
  const existing = res.items?.[0];
  const value = on ? "on" : "off";
  if (existing) {
    await adminClient.items.update("SiteSettings", { ...existing, value });
  } else {
    await adminClient.items.insert("SiteSettings", { key: SETTING_KEY, value });
  }
}
