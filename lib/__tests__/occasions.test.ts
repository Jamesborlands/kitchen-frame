import { describe, it, expect } from "vitest";
import { upcomingOccasions, type Occasion } from "@/lib/occasions";

const NOW = new Date("2026-06-25T08:00:00Z");

const occasions: Occasion[] = [
  { name: "Kate", month: 7, day: 6, kind: "birthday", year: 1998 }, // 11 days
  { name: "Sam", month: 1, day: 10, kind: "birthday" }, // far → next Jan
  { name: "Anne & Peter's wedding", month: 6, day: 25, kind: "anniversary", year: 1990 }, // today
  { name: "everyone in Ludlow", month: 12, day: 24, kind: "event", year: 2026 }, // far event
];

describe("upcomingOccasions", () => {
  it("sorts by soonest, computes days and ages within the window", () => {
    const next = upcomingOccasions(occasions, NOW, 3, 90);
    expect(next[0]).toMatchObject({ name: "Anne & Peter's wedding", days: 0, years: 36 });
    expect(next[1]).toMatchObject({ name: "Kate", days: 11, years: 28 });
    // Sam (next January) and the Dec event are outside the 90-day window
    expect(next.map((n) => n.name)).not.toContain("Sam");
  });

  it("rolls a birthday that already passed this year to next year", () => {
    const past: Occasion[] = [{ name: "Tom", month: 6, day: 1, kind: "birthday" }];
    const next = upcomingOccasions(past, NOW, 1, 400);
    expect(next[0].whenISO).toBe("2027-06-01");
  });

  it("drops a one-off event that has already passed", () => {
    const past: Occasion[] = [{ name: "old party", month: 6, day: 1, kind: "event", year: 2026 }];
    expect(upcomingOccasions(past, NOW, 3, 400)).toEqual([]);
  });

  it("returns [] for no occasions", () => {
    expect(upcomingOccasions([], NOW)).toEqual([]);
  });
});
