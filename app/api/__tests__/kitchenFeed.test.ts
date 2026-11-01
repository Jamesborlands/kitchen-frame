import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { GET } from "@/app/api/kitchen/feed/route";
import { __resetFrameForTest } from "@/lib/frame/store";

beforeEach(async () => { await __resetFrameForTest(); });
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe("GET /api/kitchen/feed", () => {
  it("answers 200 with a feed even when every upstream is down", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    const res = await GET();
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");
    const body = await res.json();
    expect(body.feedVersion).toBe(1);
    expect(body.weather).toBeNull();
    expect(body.clocks.length).toBeGreaterThan(0);
  });
});
