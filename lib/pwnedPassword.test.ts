import { createHash } from "crypto";
import { describe, expect, it } from "vitest";
import { passwordSeenInBreaches } from "./pwnedPassword";

/** Have I Been Pwned's range API: "SUFFIX:COUNT" lines, CRLF, padded with count-0 lines. */

const sha1 = (s: string) => createHash("sha1").update(s).digest("hex").toUpperCase();

function service(breached: Record<string, number>) {
  const asked: { url: string; headers: Record<string, string> }[] = [];
  const fetchFn = async (url: string, init?: RequestInit) => {
    asked.push({ url, headers: (init?.headers ?? {}) as Record<string, string> });
    const prefix = url.slice(-5);
    const lines = Object.entries(breached)
      .map(([pw, n]) => [sha1(pw), n] as const)
      .filter(([h]) => h.startsWith(prefix))
      .map(([h, n]) => `${h.slice(5)}:${n}`);
    lines.push("0000000000000000000000000000000000A:0"); // padding
    return new Response(lines.join("\r\n"));
  };
  return { fetchFn, asked };
}

describe("breached passwords", () => {
  it("finds one that's in a breach, sending only the first 5 characters of its hash", async () => {
    const { fetchFn, asked } = service({ "Password12345": 412 });
    expect(await passwordSeenInBreaches("Password12345", fetchFn)).toBe(true);
    expect(asked[0].url).toBe(`https://api.pwnedpasswords.com/range/${sha1("Password12345").slice(0, 5)}`);
    expect(asked[0].url).not.toContain(sha1("Password12345").slice(5));
    expect(asked[0].headers["Add-Padding"]).toBe("true");
  });

  it("lets through one that isn't, including a padding line's match", async () => {
    const { fetchFn } = service({ "Password12345": 412 });
    expect(await passwordSeenInBreaches("a quiet harbour at dawn 7", fetchFn)).toBe(false);
    const padded = service({ "Password12345": 0 });
    expect(await passwordSeenInBreaches("Password12345", padded.fetchFn)).toBe(false);
  });

  it("says it doesn't know when the service can't answer, rather than blocking a sign-up", async () => {
    expect(await passwordSeenInBreaches("anything long", async () => new Response("", { status: 503 }))).toBeNull();
    expect(await passwordSeenInBreaches("anything long", async () => Promise.reject(new Error("offline")))).toBeNull();
  });
});
