import { describe, it, expect, vi } from "vitest";
import { queryAllItems } from "./queryAll";

/**
 * Stands in for a Wix Data query, which pages with limit + skip and
 * returns at most `limit` rows. The real client is never touched here.
 */
function fakeCollection(total: number) {
  const calls: Array<{ limit: number; skip: number }> = [];

  const build = () => {
    let limit = 50;
    let skip = 0;
    const q: any = {
      limit(n: number) {
        limit = n;
        return q;
      },
      skip(n: number) {
        skip = n;
        return q;
      },
      async find() {
        calls.push({ limit, skip });
        const items = Array.from({ length: total })
          .map((_, i) => ({ _id: `row-${i}` }))
          .slice(skip, skip + limit);
        return { items };
      },
    };
    return q;
  };

  return { build, calls };
}

describe("queryAllItems", () => {
  it("returns everything when it fits in one page", async () => {
    const { build, calls } = fakeCollection(37);
    const items = await queryAllItems(build, "test");
    expect(items).toHaveLength(37);
    // One request, and not the 50-row default that caused the bug.
    expect(calls).toEqual([{ limit: 1000, skip: 0 }]);
  });

  it("reads past the first page", async () => {
    // The whole point: an unpaged find() returns 50 and looks complete.
    const { build, calls } = fakeCollection(2500);
    const items = await queryAllItems(build, "test");
    expect(items).toHaveLength(2500);
    expect(calls.map((c) => c.skip)).toEqual([0, 1000, 2000]);
  });

  it("stops cleanly on an exact page boundary", async () => {
    const { build, calls } = fakeCollection(2000);
    const items = await queryAllItems(build, "test");
    expect(items).toHaveLength(2000);
    // A full final page must be followed by one more request, or the last
    // rows are silently dropped whenever the total is an exact multiple.
    expect(calls).toHaveLength(3);
  });

  it("handles an empty collection", async () => {
    const { build } = fakeCollection(0);
    expect(await queryAllItems(build, "test")).toEqual([]);
  });

  it("complains loudly rather than passing off a truncated read as complete", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const { build } = fakeCollection(50_000);
    const items = await queryAllItems(build, "test");
    expect(items).toHaveLength(20_000);
    expect(error).toHaveBeenCalledOnce();
    expect(String(error.mock.calls[0][0])).toContain("truncated");
    error.mockRestore();
  });
});
