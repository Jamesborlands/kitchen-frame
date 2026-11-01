import { describe, it, expect } from "vitest";
import { suggestionForDate, dayOfYear, ALL_PLACES } from "@/lib/content/suggestion";
import { WALKS } from "@/lib/content/walks";

describe("content data", () => {
  it("has curated walks with required fields", () => {
    expect(WALKS.length).toBeGreaterThanOrEqual(6);
    for (const p of WALKS) {
      expect(p.name).toBeTruthy();
      expect(p.note).toBeTruthy();
      expect(p.category).toBe("walk");
    }
  });
  it("aggregates every category into ALL_PLACES", () => {
    expect(ALL_PLACES.length).toBeGreaterThanOrEqual(20);
  });
});

describe("suggestionForDate", () => {
  it("is deterministic for a given date", () => {
    const d = new Date("2026-06-23T08:00:00Z");
    expect(suggestionForDate(d)).toEqual(suggestionForDate(d));
  });
  it("rotates across consecutive days", () => {
    const a = suggestionForDate(new Date("2026-06-23T08:00:00Z"));
    const b = suggestionForDate(new Date("2026-06-24T08:00:00Z"));
    expect(a).not.toEqual(b);
  });
  it("dayOfYear is 1 on Jan 1", () => {
    expect(dayOfYear(new Date("2026-01-01T12:00:00Z"))).toBe(1);
  });
});
