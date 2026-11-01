import { describe, it, expect, vi, afterEach } from "vitest";
import { getJson } from "@/lib/hooks/getJson";

afterEach(() => vi.unstubAllGlobals());

describe("getJson", () => {
  it("returns the parsed body", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => [1, 2] }));
    expect(await getJson<number[]>("/api/tides")).toEqual([1, 2]);
  });
  it("throws on an error response rather than returning the error body", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 502, json: async () => ({ error: "tides unavailable" }) }));
    await expect(getJson("/api/tides")).rejects.toThrow("/api/tides 502");
  });
});
