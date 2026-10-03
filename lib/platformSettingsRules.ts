/**
 * Platform settings: the switches and numbers an admin controls from the
 * admin dashboard's "Platform settings" tab (handoff pack, FINAL-SPEC §4,
 * §9). Pure rules only — no storage — so the server, the admin page and
 * the business portal all read the same definitions. Stored by
 * lib/platformSettings.ts; enforced on the server (app/api/deals/create).
 *
 * Only switches the server actually enforces are here. Public visibility
 * is still the launch switch in code (SITE_LAUNCHED in lib/siteConfig.ts)
 * and is shown read-only beside these.
 */

export interface PlatformSettings {
  /** Businesses can submit deals for review (after launch; before launch
   *  only drafts can be saved, whatever this says). */
  acceptSubmissions: boolean;
  /** New Everyday / Flash deals can be created and submitted. Turning one
   *  off never ends or hides deals already running. */
  everydayEnabled: boolean;
  flashEnabled: boolean;
  /** Every new deal waits for an admin. Off: the AI first-pass review may
   *  publish a clean deal from an approved business straight away, as
   *  before this setting existed. */
  requireApproval: boolean;
  /** Take credits when a deal is submitted. Off: submissions are free and
   *  record 0 credits charged. */
  chargeCredits: boolean;
  /** Credits per deal, by type. Apply to new submissions only. */
  everydayCredits: number;
  flashCredits: number;
  /** Longest run a business can choose. Shortening only: a run can't be
   *  set beyond the product maximums (30 days, 6 hours). */
  everydayMaxDays: number;
  flashMaxHours: number;
}

/** What a fresh store starts with: today's behaviour, plus the agreed
 *  credit costs (Everyday 4, Flash 1). */
export const DEFAULT_PLATFORM_SETTINGS: PlatformSettings = {
  acceptSubmissions: true,
  everydayEnabled: true,
  flashEnabled: true,
  requireApproval: false,
  chargeCredits: true,
  everydayCredits: 4,
  flashCredits: 1,
  everydayMaxDays: 30,
  flashMaxHours: 6,
};

export const SETTING_LIMITS = {
  credits: { min: 1, max: 100 },
  everydayMaxDays: { min: 1, max: 30 },
  flashMaxHours: { min: 1, max: 6 },
} as const;

const BOOLEAN_KEYS = [
  "acceptSubmissions",
  "everydayEnabled",
  "flashEnabled",
  "requireApproval",
  "chargeCredits",
] as const;

export const SETTING_LABELS: Record<keyof PlatformSettings, string> = {
  acceptSubmissions: "Accept deal submissions",
  everydayEnabled: "Everyday deals",
  flashEnabled: "Flash deals",
  requireApproval: "Every deal waits for admin approval",
  chargeCredits: "Charge credits",
  everydayCredits: "Everyday deal cost",
  flashCredits: "Flash deal cost",
  everydayMaxDays: "Everyday maximum run",
  flashMaxHours: "Flash maximum run",
};

/**
 * Builds settings from untrusted input (a request body, or a stored value
 * from an older version): known keys only, each checked; anything missing
 * falls back to `base`. Returns the problems found, worded for an admin.
 */
export function parsePlatformSettings(
  input: unknown,
  base: PlatformSettings = DEFAULT_PLATFORM_SETTINGS,
): { settings: PlatformSettings; errors: string[] } {
  // Own properties only: nothing inherited through a prototype is read.
  const src: Record<string, unknown> =
    input && typeof input === "object" && !Array.isArray(input)
      ? Object.fromEntries(Object.entries(input as Record<string, unknown>))
      : {};
  const errors: string[] = [];
  const settings: PlatformSettings = { ...base };

  for (const key of BOOLEAN_KEYS) {
    if (src[key] === undefined) continue;
    if (typeof src[key] !== "boolean") errors.push(`${SETTING_LABELS[key]} must be on or off.`);
    else settings[key] = src[key] as boolean;
  }

  const whole = (key: keyof PlatformSettings, min: number, max: number, unit: string) => {
    if (src[key] === undefined) return;
    const n = src[key];
    if (typeof n !== "number" || !Number.isInteger(n) || n < min || n > max) {
      errors.push(`${SETTING_LABELS[key]} must be a whole number from ${min} to ${max} ${unit}.`);
    } else {
      (settings as unknown as Record<string, number>)[key] = n;
    }
  };
  whole("everydayCredits", SETTING_LIMITS.credits.min, SETTING_LIMITS.credits.max, "credits");
  whole("flashCredits", SETTING_LIMITS.credits.min, SETTING_LIMITS.credits.max, "credits");
  whole("everydayMaxDays", SETTING_LIMITS.everydayMaxDays.min, SETTING_LIMITS.everydayMaxDays.max, "days");
  whole("flashMaxHours", SETTING_LIMITS.flashMaxHours.min, SETTING_LIMITS.flashMaxHours.max, "hours");

  return { settings, errors };
}

/** Credits a new deal of this type costs now: 0 when charging is off. */
export function dealCreditCost(isFlash: boolean, s: PublicPlatformSettings): number {
  if (!s.chargeCredits) return 0;
  return isFlash ? s.flashCredits : s.everydayCredits;
}

/** What a deal type is called, for messages. */
export function dealTypeName(isFlash: boolean): string {
  return isFlash ? "Flash deal" : "Everyday deal";
}

/** "1 credit", "4 credits", "free". */
export function creditsLabel(n: number): string {
  return n === 0 ? "free" : `${n} credit${n === 1 ? "" : "s"}`;
}

/** Why a business can't create or submit this type of deal right now, or
 *  null if it can. */
export function dealTypeBlocked(isFlash: boolean, s: PublicPlatformSettings): string | null {
  if (isFlash && !s.flashEnabled) return "New Flash deals are paused at the moment.";
  if (!isFlash && !s.everydayEnabled) return "New Everyday deals are paused at the moment.";
  return null;
}

/** Longest run a business may choose now, in the unit the form uses
 *  (minutes for Flash, days for Everyday). */
export function maxRequestedDuration(isFlash: boolean, s: PublicPlatformSettings): number {
  return isFlash ? s.flashMaxHours * 60 : s.everydayMaxDays;
}

export interface SettingChange {
  key: keyof PlatformSettings;
  from: boolean | number;
  to: boolean | number;
}

export function diffPlatformSettings(a: PlatformSettings, b: PlatformSettings): SettingChange[] {
  return (Object.keys(SETTING_LABELS) as (keyof PlatformSettings)[])
    .filter((k) => a[k] !== b[k])
    .map((k) => ({ key: k, from: a[k], to: b[k] }));
}

/** Plain-English consequences of a set of changes, for the confirmation
 *  step before saving. Every change gets a line; the consequential ones
 *  say what they do and don't affect. */
export function settingImpacts(changes: SettingChange[]): string[] {
  return changes.map(({ key, to }) => {
    switch (key) {
      case "acceptSubmissions":
        return to
          ? "Businesses can submit deals for review again (after launch)."
          : "Businesses can't submit new deals. Drafts can still be saved, and deals already live or in review are unchanged.";
      case "everydayEnabled":
      case "flashEnabled": {
        const type = key === "flashEnabled" ? "Flash" : "Everyday";
        return to
          ? `Businesses can create and submit ${type} deals again.`
          : `No new ${type} deals can be submitted. ${type} deals already live keep running to their end date.`;
      }
      case "requireApproval":
        return to
          ? "Every new deal waits for you. The AI review can still turn down clearly unsuitable deals, but won't publish any."
          : "The AI review may publish a clean deal from an approved business straight away, as before.";
      case "chargeCredits":
        return to
          ? "New submissions take credits again, at the costs below."
          : "New submissions are free: no credits are taken. Credits already spent aren't returned.";
      case "everydayCredits":
      case "flashCredits":
        return "Applies to new submissions. Deals already submitted keep what they cost.";
      case "everydayMaxDays":
      case "flashMaxHours":
        return "Applies to new deals. Deals already submitted keep the run they chose.";
    }
  });
}

/** Credits to give back when a deal is withdrawn or turned down: what it
 *  was charged. Deals from before costs were recorded were charged 1. */
export function creditsToRefund(deal: Record<string, unknown>): number {
  const charged = deal.creditsCharged;
  if (typeof charged === "number" && Number.isInteger(charged) && charged >= 0) return charged;
  return 1;
}

/** The part of the settings the business portal is given
 *  (app/api/platform-settings). */
export type PublicPlatformSettings = Pick<
  PlatformSettings,
  | "acceptSubmissions"
  | "everydayEnabled"
  | "flashEnabled"
  | "chargeCredits"
  | "everydayCredits"
  | "flashCredits"
  | "everydayMaxDays"
  | "flashMaxHours"
>;

/** What deals cost now, in one line for the portal's credit cards:
 *  "Everyday deal: 4 credits · Flash deal: 1 credit". Paused types are
 *  left out; "free" when charging is off. */
export function dealCostsLine(s: PublicPlatformSettings): string {
  if (!s.chargeCredits) return "Deals are free to submit at the moment.";
  const parts: string[] = [];
  if (s.everydayEnabled) parts.push(`Everyday deal: ${creditsLabel(s.everydayCredits)}`);
  if (s.flashEnabled) parts.push(`Flash deal: ${creditsLabel(s.flashCredits)}`);
  return parts.length > 0 ? `${parts.join(" · ")}.` : "New deals are paused at the moment.";
}

/** A setting's value as an admin reads it: "On", "4 credits", "30 days". */
export function formatSettingValue(key: keyof PlatformSettings, v: boolean | number): string {
  if (typeof v === "boolean") return v ? "On" : "Off";
  if (key === "everydayCredits" || key === "flashCredits") return creditsLabel(v);
  if (key === "everydayMaxDays") return `${v} day${v === 1 ? "" : "s"}`;
  return `${v} hour${v === 1 ? "" : "s"}`;
}
