import { describe, it, expect } from "vitest";
import { skyCards } from "@/lib/notice/sources/sky";

describe("skyCards", () => {
  it("flags a meteor shower in the two nights up to its peak", () => {
    const cards = skyCards(new Date("2026-10-20T12:00:00Z"));
    expect(cards).toContainEqual(expect.objectContaining({ kind: "sky", label: "in the sky", title: expect.stringContaining("Orionids") }));
  });

  it("says nothing about a shower long before or after its peak", () => {
    expect(skyCards(new Date("2026-10-11T12:00:00Z")).some((c) => c.title.includes("Orionids"))).toBe(false);
    expect(skyCards(new Date("2026-10-25T12:00:00Z")).some((c) => c.title.includes("Orionids"))).toBe(false);
  });

  it("names a full moon", () => {
    // 2026-10-26 is a full moon (Hunter's Moon)
    const cards = skyCards(new Date("2026-10-26T12:00:00Z"));
    expect(cards).toContainEqual(expect.objectContaining({ kind: "sky", title: expect.stringContaining("Hunter's Moon") }));
  });

  it("is quiet on an ordinary night", () => {
    expect(skyCards(new Date("2026-10-11T12:00:00Z"))).toEqual([]);
  });
});
