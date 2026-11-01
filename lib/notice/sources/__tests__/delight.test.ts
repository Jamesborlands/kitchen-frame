import { describe, it, expect } from "vitest";
import { delightSource } from "@/lib/notice/sources/delight";
import { buildContext } from "@/lib/notice/card";

describe("delightSource", () => {
  it("always returns exactly one delight card", async () => {
    const cards = await delightSource(buildContext(new Date("2026-06-24T12:00:00Z")));
    expect(cards).toHaveLength(1);
    expect(cards[0].kind).toBe("delight");
    expect(cards[0].title.length).toBeGreaterThan(0);
    expect(cards[0].priority).toBe(10);
  });

  it("is deterministic for the same day and varies across days", async () => {
    const a = await delightSource(buildContext(new Date("2026-06-24T12:00:00Z")));
    const b = await delightSource(buildContext(new Date("2026-06-24T20:00:00Z")));
    const c = await delightSource(buildContext(new Date("2026-08-01T12:00:00Z")));
    expect(a[0].id).toBe(b[0].id);
    expect(a[0].id).not.toBe(c[0].id);
  });
});
