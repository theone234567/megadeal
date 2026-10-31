import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Google Analytics reads an event's source, medium and campaign parameters
// as the visit's traffic source: an event sending "source: footer" filed a
// visit from a Facebook ad under "footer" (owner's report, 31 Oct 2026).
// No gtag event on the site may use those names.
const RESERVED = /[{,]\s*(source|medium|campaign|term|content)\s*[:,}]/;

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) return f === "node_modules" ? [] : files(p);
    return /\.tsx?$/.test(f) && !/\.test\./.test(f) ? [p] : [];
  });
}

describe("Google Analytics events", () => {
  it("never send a parameter GA reads as the traffic source", () => {
    const offenders: string[] = [];
    for (const f of ["app", "components", "lib"].flatMap((d) => files(d))) {
      const src = readFileSync(f, "utf8");
      for (const m of src.matchAll(/gtag\?*\.?\(\s*"event"\s*,\s*[^,]+,\s*(\{[\s\S]*?\})\s*\)/g)) {
        if (RESERVED.test(m[1].replace(/\/\/[^\n]*/g, ""))) offenders.push(`${f}: ${m[1].replace(/\s+/g, " ").slice(0, 80)}`);
      }
    }
    expect(offenders).toEqual([]);
  });
});
