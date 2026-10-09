import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

/**
 * Work that finishes after the reply (lib/afterResponse.ts). The contact
 * form's email to the admin used to be started and not waited for, and
 * Cloudflare cut it off when the Worker finished: it must be handed to
 * after(), which keeps the Worker alive until it's sent.
 */

const scheduled: (() => Promise<unknown>)[] = [];
const sent: { to: string; subject: string; replyTo?: string }[] = [];

vi.mock("next/server", async (orig) => ({
  ...(await orig<typeof import("next/server")>()),
  after: (task: () => Promise<unknown>) => void scheduled.push(task),
}));
vi.mock("@/lib/dataClient", () => ({ createDataClient: () => ({ items: { insert: async () => ({}) } }) }));
vi.mock("@/lib/rateLimit", () => ({ checkRateLimit: async () => ({ limited: false }), getClientIp: () => "1.2.3.4" }));
vi.mock("@/lib/sendEmail", () => ({
  sendTransactionalEmail: async (m: { to: string; subject: string; replyTo?: string }) => {
    sent.push(m);
    return true;
  },
}));

describe("contact form notification", () => {
  beforeEach(() => {
    scheduled.length = 0;
    sent.length = 0;
    vi.stubEnv("ADMIN_NOTIFY_EMAIL", "owner@example.nz");
  });

  it("is handed to after(), so it's sent once the reply has gone", async () => {
    const { POST } = await import("@/app/api/contact/route");
    const res = await POST(
      new NextRequest("https://megadeal.co.nz/api/contact", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "Ana", email: "ana@example.nz", message: "Hello" }),
      })
    );
    expect(res.status).toBe(200);
    // Not sent in the request itself…
    expect(sent).toEqual([]);
    expect(scheduled).toHaveLength(1);
    // …but by the task after() keeps alive.
    await scheduled[0]();
    expect(sent).toEqual([expect.objectContaining({ to: "owner@example.nz", subject: "New contact message from Ana", replyTo: "ana@example.nz" })]);
  });
});

describe("afterResponse outside a request", () => {
  it("still runs the task", async () => {
    vi.resetModules();
    vi.doMock("next/server", async (orig) => ({
      ...(await orig<typeof import("next/server")>()),
      after: () => {
        throw new Error("`after` was called outside a request scope");
      },
    }));
    const { afterResponse } = await import("./afterResponse");
    let ran = false;
    afterResponse(async () => {
      ran = true;
    });
    await Promise.resolve();
    expect(ran).toBe(true);
    vi.doUnmock("next/server");
  });
});
