import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { amenityList, cleanAmenities } from "./amenities";

// T249: a new set of business photos waits for a person while the page
// keeps its current ones; amenities are kept once each.

const OLD = "https://megadeal.co.nz/media/photos/2026-10/old-aaaaaaaaaaaa.jpg";
const NEW = "https://megadeal.co.nz/media/photos/2026-10/new-bbbbbbbbbbbb.jpg";
let row: Record<string, any> = {};
vi.mock("./memberAuth", () => ({ getVerifiedMember: async () => ({ id: "u1", email: "o@cafe.invalid", loginEmailVerified: true }) }));
vi.mock("./memberRateLimit", () => ({ memberRateLimited: async () => false, memberRetryMinutes: async () => null, tryAgainIn: () => "shortly", HOUR: 3600 }));
vi.mock("./merchant", async (orig) => ({ ...(await orig<typeof import("./merchant")>()), getOrClaimMerchant: async () => row }));
vi.mock("./adminSession", () => ({ isAdminRequest: async () => true }));
vi.mock("./adminAudit", async (orig) => ({ ...(await orig<typeof import("./adminAudit")>()), logAdminAction: async () => {} }));
vi.mock("./merchantActivity", () => ({ logMerchantActivity: async () => {} }));
vi.mock("./indexNowDeal", () => ({ notifyBusinessChanged: () => {} }));
vi.mock("./dataClient", () => ({
  createDataClient: () => ({
    items: {
      get: async () => ({ ...row }),
      update: async (_c: string, item: any) => {
        // As the database stores it: an empty pending set reads as none.
        row = { ...item, pendingProfile: item.pendingProfile && Object.keys(item.pendingProfile).length ? item.pendingProfile : null };
        return row;
      },
    },
  }),
}));

const approved = () => ({
  _id: "m1", email: "o@cafe.invalid", businessName: "Kai Cafe", status: "Approved",
  photos: JSON.stringify([OLD]), logoUrl: OLD, pendingProfile: null,
});

async function savePhotos(photos: string[]) {
  const { POST } = await import("@/app/api/merchants/photos/route");
  const res = await POST(new NextRequest("http://x/api/merchants/photos", { method: "POST", body: JSON.stringify({ photos }) }));
  return { status: res.status, body: await res.json() };
}

describe("business photos (T249)", () => {
  beforeEach(() => {
    row = approved();
  });

  it("for an approved business, wait for a person while the page and status stay as they are", async () => {
    const { status, body } = await savePhotos([NEW, OLD]);
    expect(status).toBe(200);
    expect(row.status).toBe("Approved");
    expect(row.photos).toBe(JSON.stringify([OLD]));
    expect(row.logoUrl).toBe(OLD);
    expect(row.pendingProfile).toEqual({ photos: JSON.stringify([NEW, OLD]) });
    // The portal shows what it saved, marked as waiting.
    expect(body.held).toEqual(["Photos"]);
    expect(body.item.pendingFields).toContain("photos");
  });

  it("putting the current photos back clears what was waiting", async () => {
    await savePhotos([NEW]);
    await savePhotos([OLD]);
    expect(row.pendingProfile).toBeNull();
  });

  it("for a business still waiting for approval, save straight away", async () => {
    row = { ...approved(), status: "Pending" };
    await savePhotos([NEW]);
    expect(row.photos).toBe(JSON.stringify([NEW]));
    expect(row.pendingProfile).toBeNull();
  });

  it("are put live, with the small image, when an admin approves them", async () => {
    await savePhotos([NEW, OLD]);
    const { POST } = await import("@/app/api/admin/merchants/[id]/profile-changes/route");
    const res = await POST(
      new NextRequest("http://x/api/admin/merchants/m1/profile-changes", { method: "POST", body: JSON.stringify({ decision: "approve" }) }),
      { params: Promise.resolve({ id: "m1" }) },
    );
    expect(res.status).toBe(200);
    expect(row.photos).toBe(JSON.stringify([NEW, OLD]));
    expect(row.logoUrl).toBe(NEW);
    expect(row.pendingProfile).toBeNull();
  });
});

describe("amenities (T249)", () => {
  it("are kept once each, whatever the capitals or spacing", () => {
    expect(amenityList(" Wi-Fi, wi-fi ,Parking,,  Outdoor   seating, PARKING ")).toEqual(["Wi-Fi", "Parking", "Outdoor seating"]);
    expect(cleanAmenities("Wi-Fi, Wi-Fi")).toBe("Wi-Fi");
    expect(cleanAmenities(null)).toBe("");
  });
});
