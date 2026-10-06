import { describe, vi } from "vitest";
import { checkPageMetadata } from "./pageMetaLimits.testutil";

// Every page's search title and description fit what search results show,
// before launch (lib/pageMetaLimits.testutil.ts).
vi.mock("@/lib/siteConfig", async (orig) => ({ ...(await orig<typeof import("@/lib/siteConfig")>()), SITE_LAUNCHED: false }));
vi.mock("@/lib/fonts", () => ({ fredoka: { className: "" }, plusJakartaSans: { className: "" }, caveat: { className: "" } }));

describe("page titles and descriptions fit search results, before launch", checkPageMetadata);
