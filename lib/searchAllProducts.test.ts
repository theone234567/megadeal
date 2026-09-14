import { describe, it, expect, vi } from "vitest";
import { searchAllProducts } from "./searchAllProducts";

/**
 * A stand-in for adminClient.productsV3, recording every request it is
 * given so the tests can assert on the shape that actually goes to Wix —
 * the original bug was a request that looked paged and wasn't.
 */
function fakeClient(pages: { products: any[]; next?: string }[]) {
  const requests: any[] = [];
  return {
    requests,
    client: {
      productsV3: {
        searchProducts: async (req: any) => {
          requests.push(req);
          const cursor = req?.search?.cursorPaging?.cursor ?? null;
          const index = cursor ? Number(cursor) : 0;
          const page = pages[index];
          return {
            products: page.products,
            pagingMetadata: page.next
              ? { hasNext: true, cursors: { next: page.next } }
              : { hasNext: false, cursors: {} },
          };
        },
      },
    },
  };
}

describe("searchAllProducts", () => {
  it("puts cursorPaging inside search, where the API reads it", async () => {
    const { client, requests } = fakeClient([{ products: [{ id: "a" }] }]);
    await searchAllProducts(client, ["CURRENCY"], "test");

    expect(requests[0].search.cursorPaging.limit).toBe(100);
    // The bug: cursorPaging sat at the top level, so the request carried no
    // paging options at all and `as any` kept the compiler quiet about it.
    expect(requests[0].cursorPaging).toBeUndefined();
    expect(requests[0].fields).toEqual(["CURRENCY"]);
  });

  it("follows the cursor until the catalogue runs out", async () => {
    const { client, requests } = fakeClient([
      { products: [{ id: "a" }, { id: "b" }], next: "1" },
      { products: [{ id: "c" }], next: "2" },
      { products: [{ id: "d" }] },
    ]);

    const all = await searchAllProducts(client, [], "test");

    expect(all.map((p) => p.id)).toEqual(["a", "b", "c", "d"]);
    expect(requests).toHaveLength(3);
    expect(requests[1].search.cursorPaging.cursor).toBe("1");
    // Later pages carry the cursor alone: it already encodes the query.
    expect(requests[1].search.cursorPaging.limit).toBeUndefined();
  });

  it("stops when hasNext is false even if a cursor is echoed back", async () => {
    const client = {
      productsV3: {
        searchProducts: async () => ({
          products: [{ id: "a" }],
          // Wix returns a `next` cursor on the last page too; hasNext is
          // the field that actually says whether to ask for another.
          pagingMetadata: { hasNext: false, cursors: { next: "9" } },
        }),
      },
    };
    const all = await searchAllProducts(client, [], "test");
    expect(all).toHaveLength(1);
  });

  it("drops nulls and survives a response with no products at all", async () => {
    const client = {
      productsV3: {
        searchProducts: async () => ({ products: [null, { id: "a" }, undefined] }),
      },
    };
    expect(await searchAllProducts(client, [], "test")).toEqual([{ id: "a" }]);

    const empty = { productsV3: { searchProducts: async () => ({}) } };
    expect(await searchAllProducts(empty, [], "test")).toEqual([]);
  });

  it("logs rather than silently truncating when the page cap is hit", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const client = {
      productsV3: {
        searchProducts: async () => ({
          products: [{ id: "x" }],
          pagingMetadata: { hasNext: true, cursors: { next: "more" } },
        }),
      },
    };

    const all = await searchAllProducts(client, [], "runaway");

    expect(all).toHaveLength(25);
    expect(spy).toHaveBeenCalledWith(expect.stringContaining("runaway"));
    spy.mockRestore();
  });
});
