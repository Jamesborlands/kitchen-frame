import { describe, it, expect, vi } from "vitest";
import { lastGood } from "@/lib/kitchen/feed/lastGood";

describe("lastGood", () => {
  it("caches within the TTL", async () => {
    const get = lastGood<number>(1000);
    const load = vi.fn().mockResolvedValue(1);
    expect(await get("a", 0, load)).toEqual({ value: 1, fetchedAt: 0 });
    expect(await get("a", 500, load)).toEqual({ value: 1, fetchedAt: 0 });
    expect(load).toHaveBeenCalledOnce();
  });

  it("refetches after the TTL", async () => {
    const get = lastGood<number>(1000);
    await get("a", 0, async () => 1);
    expect(await get("a", 1500, async () => 2)).toEqual({ value: 2, fetchedAt: 1500 });
  });

  it("keeps the old value and its original time when a refetch fails", async () => {
    const get = lastGood<number>(1000);
    await get("a", 0, async () => 1);
    const out = await get("a", 5000, async () => { throw new Error("down"); });
    expect(out).toEqual({ value: 1, fetchedAt: 0 });
  });

  it("is null when the very first fetch fails", async () => {
    const get = lastGood<number>(1000);
    expect(await get("a", 0, async () => { throw new Error("down"); })).toBeNull();
  });

  it("keeps keys apart", async () => {
    const get = lastGood<string>(1000);
    await get("a", 0, async () => "A");
    expect(await get("b", 0, async () => "B")).toEqual({ value: "B", fetchedAt: 0 });
  });
});
