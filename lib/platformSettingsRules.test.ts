import { describe, expect, it } from "vitest";
import {
  DEFAULT_PLATFORM_SETTINGS as D,
  creditsLabel,
  creditsToRefund,
  dealCostsLine,
  dealCreditCost,
  dealTypeBlocked,
  diffPlatformSettings,
  formatSettingValue,
  maxRequestedDuration,
  parsePlatformSettings,
  settingImpacts,
} from "./platformSettingsRules";
import { durationError, everydayOptionsUpTo, flashOptionsUpTo } from "./dealDuration";

describe("platform settings defaults", () => {
  it("keep today's behaviour with the agreed costs", () => {
    expect(D).toEqual({
      acceptSubmissions: true,
      everydayEnabled: true,
      flashEnabled: true,
      requireApproval: false,
      chargeCredits: true,
      everydayCredits: 4,
      flashCredits: 1,
      everydayMaxDays: 30,
      flashMaxHours: 6,
    });
  });
});

describe("parsePlatformSettings", () => {
  it("takes known keys only and ignores anything else sent", () => {
    const { settings, errors } = parsePlatformSettings({
      everydayCredits: 5,
      isAdmin: true,
      creditsBalance: 999,
      __proto__: { flashCredits: 50 },
    });
    expect(errors).toEqual([]);
    expect(settings).toEqual({ ...D, everydayCredits: 5 });
    expect(Object.keys(settings).sort()).toEqual(Object.keys(D).sort());
  });

  it("falls back to the base for missing keys", () => {
    const base = { ...D, flashCredits: 3 };
    expect(parsePlatformSettings({}, base).settings).toEqual(base);
    expect(parsePlatformSettings(null, base).settings).toEqual(base);
    expect(parsePlatformSettings("nonsense", base).settings).toEqual(base);
  });

  it("rejects wrong types and out-of-range numbers, keeping the base value", () => {
    const { settings, errors } = parsePlatformSettings({
      flashEnabled: "false",
      everydayCredits: 0,
      flashCredits: 2.5,
      everydayMaxDays: 31,
      flashMaxHours: 7,
    });
    expect(errors).toHaveLength(5);
    expect(settings).toEqual(D);
    expect(errors[0]).toBe("Flash deals must be on or off.");
    expect(errors).toContain("Everyday maximum run must be a whole number from 1 to 30 days.");
    expect(errors).toContain("Flash maximum run must be a whole number from 1 to 6 hours.");
  });

  it("rejects numbers sent as text and NaN", () => {
    expect(parsePlatformSettings({ everydayCredits: "4" }).errors).toHaveLength(1);
    expect(parsePlatformSettings({ everydayCredits: NaN }).errors).toHaveLength(1);
  });
});

describe("costs", () => {
  it("Everyday 4, Flash 1 by default, 0 when charging is off", () => {
    expect(dealCreditCost(false, D)).toBe(4);
    expect(dealCreditCost(true, D)).toBe(1);
    expect(dealCreditCost(false, { ...D, chargeCredits: false })).toBe(0);
    expect(dealCreditCost(true, { ...D, chargeCredits: false })).toBe(0);
  });

  it("labels credits", () => {
    expect(creditsLabel(0)).toBe("free");
    expect(creditsLabel(1)).toBe("1 credit");
    expect(creditsLabel(4)).toBe("4 credits");
  });

  it("describes the costs for the portal", () => {
    expect(dealCostsLine(D)).toBe("Everyday deal: 4 credits · Flash deal: 1 credit.");
    expect(dealCostsLine({ ...D, flashEnabled: false })).toBe("Everyday deal: 4 credits.");
    expect(dealCostsLine({ ...D, flashEnabled: false, everydayEnabled: false })).toBe(
      "New deals are paused at the moment.",
    );
    expect(dealCostsLine({ ...D, chargeCredits: false })).toBe("Deals are free to submit at the moment.");
  });
});

describe("refunds return what was charged", () => {
  it("uses the recorded charge", () => {
    expect(creditsToRefund({ creditsCharged: 4 })).toBe(4);
    expect(creditsToRefund({ creditsCharged: 1 })).toBe(1);
    expect(creditsToRefund({ creditsCharged: 0 })).toBe(0);
  });
  it("treats deals from before costs were recorded as 1 credit", () => {
    expect(creditsToRefund({})).toBe(1);
    expect(creditsToRefund({ creditsCharged: null })).toBe(1);
    expect(creditsToRefund({ creditsCharged: "4" })).toBe(1);
    expect(creditsToRefund({ creditsCharged: -2 })).toBe(1);
    expect(creditsToRefund({ creditsCharged: 1.5 })).toBe(1);
  });
});

describe("deal types and durations", () => {
  it("blocks a paused type only", () => {
    expect(dealTypeBlocked(true, D)).toBeNull();
    expect(dealTypeBlocked(false, D)).toBeNull();
    expect(dealTypeBlocked(true, { ...D, flashEnabled: false })).toBe("New Flash deals are paused at the moment.");
    expect(dealTypeBlocked(false, { ...D, flashEnabled: false })).toBeNull();
    expect(dealTypeBlocked(false, { ...D, everydayEnabled: false })).toBe(
      "New Everyday deals are paused at the moment.",
    );
  });

  it("gives the longest run in the form's unit", () => {
    expect(maxRequestedDuration(true, D)).toBe(360);
    expect(maxRequestedDuration(false, D)).toBe(30);
    expect(maxRequestedDuration(true, { ...D, flashMaxHours: 2 })).toBe(120);
    expect(maxRequestedDuration(false, { ...D, everydayMaxDays: 10 })).toBe(10);
  });

  it("enforces a shorter maximum, never a longer one", () => {
    expect(durationError(false, 14, 10)).toBe("Deals can run for up to 10 days.");
    expect(durationError(false, 10, 10)).toBeNull();
    expect(durationError(true, 180, 120)).toBe("Flash Deals can run for up to 2 hours.");
    expect(durationError(true, 120, 120)).toBeNull();
    expect(durationError(false, 31, 60)).toBe("Deals can run for up to 30 days.");
    expect(durationError(true, 420, 600)).toBe("Flash Deals can run for up to 6 hours.");
  });

  it("offers run lengths up to the maximum, including the maximum", () => {
    expect(everydayOptionsUpTo(30).map((o) => o.days)).toEqual([1, 3, 7, 14, 30]);
    expect(everydayOptionsUpTo(10).map((o) => o.days)).toEqual([1, 3, 7, 10]);
    expect(everydayOptionsUpTo(10).at(-1)?.label).toBe("10 days");
    expect(everydayOptionsUpTo(1).map((o) => o.days)).toEqual([1]);
    expect(flashOptionsUpTo(360).map((o) => o.minutes)).toEqual([30, 60, 120, 240, 360]);
    expect(flashOptionsUpTo(180).map((o) => o.minutes)).toEqual([30, 60, 120, 180]);
    expect(flashOptionsUpTo(180).at(-1)?.label).toBe("3 hours");
    expect(flashOptionsUpTo(60).map((o) => o.minutes)).toEqual([30, 60]);
  });
});

describe("change history and confirmations", () => {
  it("lists only what changed", () => {
    const changes = diffPlatformSettings(D, { ...D, flashEnabled: false, everydayCredits: 5 });
    expect(changes).toEqual([
      { key: "flashEnabled", from: true, to: false },
      { key: "everydayCredits", from: 4, to: 5 },
    ]);
    expect(diffPlatformSettings(D, { ...D })).toEqual([]);
  });

  it("explains each change in plain English", () => {
    const lines = settingImpacts(diffPlatformSettings(D, { ...D, flashEnabled: false, chargeCredits: false }));
    expect(lines).toHaveLength(2);
    expect(lines[0]).toContain("Flash deals already live keep running");
    expect(lines[1]).toContain("Credits already spent aren't returned");
  });

  it("formats values for an admin", () => {
    expect(formatSettingValue("acceptSubmissions", true)).toBe("On");
    expect(formatSettingValue("requireApproval", false)).toBe("Off");
    expect(formatSettingValue("everydayCredits", 4)).toBe("4 credits");
    expect(formatSettingValue("flashCredits", 1)).toBe("1 credit");
    expect(formatSettingValue("everydayMaxDays", 1)).toBe("1 day");
    expect(formatSettingValue("flashMaxHours", 6)).toBe("6 hours");
  });
});

describe("parsePlatformSettings with a JSON body", () => {
  it("ignores a __proto__ key from JSON", () => {
    const body = JSON.parse('{"__proto__": {"flashCredits": 50}, "constructor": {"x": 1}}');
    expect(parsePlatformSettings(body)).toEqual({ settings: D, errors: [] });
  });
});
