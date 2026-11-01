import { describe, it, expect, vi, afterEach } from "vitest";
import { GET } from "@/app/api/notice/route";

afterEach(() => vi.restoreAllMocks());

describe("GET /api/notice", () => {
  it("returns a JSON array of cards (200)", async () => {
    // delight + on-this-day floor guarantees content even with network stubbed out
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ selected: [] }) }));
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThan(0); // delight floor
  });
});
