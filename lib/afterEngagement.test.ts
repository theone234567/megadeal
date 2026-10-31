import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { afterEngagement, arrivedFromAd, ENGAGE_FALLBACK_MS, resetAfterEngagementForTests } from "./afterEngagement";

// A bare window/document: enough for the listeners and timers it uses.
function fakeBrowser(readyState: "loading" | "complete") {
  const listeners = new Map<string, Set<() => void>>();
  const win = {
    addEventListener: (e: string, fn: () => void) => {
      if (!listeners.has(e)) listeners.set(e, new Set());
      listeners.get(e)!.add(fn);
    },
    removeEventListener: (e: string, fn: () => void) => listeners.get(e)?.delete(fn),
    setTimeout: (fn: () => void, ms: number) => setTimeout(fn, ms),
  };
  vi.stubGlobal("window", win);
  vi.stubGlobal("document", { readyState });
  return {
    emit(e: string) {
      for (const fn of [...(listeners.get(e) ?? [])]) {
        listeners.get(e)!.delete(fn); // `once`
        fn();
      }
    },
    count: (e: string) => listeners.get(e)?.size ?? 0,
  };
}

describe("afterEngagement (T244)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resetAfterEngagementForTests();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("waits for the first tap, then runs every queued script once", () => {
    const b = fakeBrowser("complete");
    const ga = vi.fn();
    const pixel = vi.fn();
    afterEngagement(ga);
    afterEngagement(pixel);
    expect(ga).not.toHaveBeenCalled();
    b.emit("pointerdown");
    expect(ga).toHaveBeenCalledTimes(1);
    expect(pixel).toHaveBeenCalledTimes(1);
    expect(b.count("scroll")).toBe(0);
    vi.advanceTimersByTime(ENGAGE_FALLBACK_MS + 10);
    expect(ga).toHaveBeenCalledTimes(1);
  });

  it("runs 5 seconds after load when nobody touches the page", () => {
    const b = fakeBrowser("loading");
    const run = vi.fn();
    afterEngagement(run);
    vi.advanceTimersByTime(ENGAGE_FALLBACK_MS * 2);
    expect(run).not.toHaveBeenCalled(); // the clock starts at load
    b.emit("load");
    vi.advanceTimersByTime(ENGAGE_FALLBACK_MS - 1);
    expect(run).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(run).toHaveBeenCalledTimes(1);
  });

  it("runs straight away once already triggered, and one failure doesn't stop the rest", () => {
    const b = fakeBrowser("complete");
    const after = vi.fn();
    afterEngagement(() => {
      throw new Error("blocked");
    });
    afterEngagement(after);
    b.emit("scroll");
    expect(after).toHaveBeenCalledTimes(1);
    const late = vi.fn();
    afterEngagement(late);
    expect(late).toHaveBeenCalledTimes(1);
  });
});

describe("visitors from an ad are tracked straight away", () => {
  beforeEach(() => resetAfterEngagementForTests());
  afterEach(() => vi.unstubAllGlobals());

  it("recognises an ad click's address", () => {
    expect(arrivedFromAd("?fbclid=IwAR123")).toBe(true);
    expect(arrivedFromAd("?utm_source=facebook&utm_medium=paid")).toBe(true);
    expect(arrivedFromAd("?gclid=abc")).toBe(true);
    expect(arrivedFromAd("")).toBe(false);
    expect(arrivedFromAd("?q=pizza&category=food-drink")).toBe(false);
  });

  it("runs the scripts at once for an ad visitor, without waiting", () => {
    vi.stubGlobal("window", { location: { search: "?fbclid=IwAR123" }, addEventListener: vi.fn(), removeEventListener: vi.fn(), setTimeout: vi.fn() });
    vi.stubGlobal("document", { readyState: "complete" });
    const ga = vi.fn();
    const pixel = vi.fn();
    afterEngagement(ga);
    afterEngagement(pixel);
    expect(ga).toHaveBeenCalledTimes(1);
    expect(pixel).toHaveBeenCalledTimes(1);
  });

  it("still waits for everyone else", () => {
    const add = vi.fn();
    vi.stubGlobal("window", { location: { search: "?q=pizza" }, addEventListener: add, removeEventListener: vi.fn(), setTimeout: vi.fn() });
    vi.stubGlobal("document", { readyState: "complete" });
    const ga = vi.fn();
    afterEngagement(ga);
    expect(ga).not.toHaveBeenCalled();
    expect(add).toHaveBeenCalled();
  });
});
