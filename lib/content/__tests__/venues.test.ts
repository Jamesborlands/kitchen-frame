import { describe, it, expect } from "vitest";
import { VENUES } from "@/lib/content/venues";

describe("VENUES", () => {
  it("lists the main local theatres & venues", () => {
    expect(VENUES.length).toBeGreaterThanOrEqual(3);
    expect(VENUES.some((v) => /assembly rooms/i.test(v.name))).toBe(true);
    expect(VENUES.some((v) => /castle/i.test(v.name))).toBe(true);
  });

  it("each venue has a name, a note, and an https what's-on link", () => {
    for (const v of VENUES) {
      expect(v.name.length).toBeGreaterThan(0);
      expect(v.note.length).toBeGreaterThan(0);
      expect(v.url).toMatch(/^https:\/\//);
    }
  });
});
