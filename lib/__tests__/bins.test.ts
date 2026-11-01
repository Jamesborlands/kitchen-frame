import { describe, it, expect } from "vitest";
import { nextCollections, type BinSchedule } from "@/lib/bins";

// Tuesday collections; 2026-06-23 is a "week A" Tuesday.
const schedule: BinSchedule = {
  weekday: 2, // Tuesday
  anchor: "2026-06-23",
  types: [
    { name: "general waste", week: "A" },
    { name: "recycling", week: "B" },
    { name: "garden", week: "every" },
  ],
};

describe("nextCollections", () => {
  it("returns the next collections on the right weekday with alternating bins", () => {
    // now = Thu 25 Jun → next Tuesday is 30 Jun (week B), then 7 Jul (week A), then 14 Jul (B)
    const cols = nextCollections(schedule, new Date("2026-06-25T08:00:00Z"), 3);
    expect(cols.map((c) => c.date)).toEqual(["2026-06-30", "2026-07-07", "2026-07-14"]);
    expect(cols[0].types).toEqual(["recycling", "garden"]); // week B + weekly
    expect(cols[1].types).toEqual(["general waste", "garden"]); // week A + weekly
    expect(cols[2].types).toEqual(["recycling", "garden"]); // week B + weekly
  });

  it("includes today if today is collection day", () => {
    // 2026-06-23 is a Tuesday (week A)
    const cols = nextCollections(schedule, new Date("2026-06-23T06:00:00Z"), 1);
    expect(cols[0].date).toBe("2026-06-23");
    expect(cols[0].types).toEqual(["general waste", "garden"]);
  });

  it("returns [] when there is no schedule", () => {
    expect(nextCollections(null, new Date("2026-06-25T08:00:00Z"))).toEqual([]);
  });
});
