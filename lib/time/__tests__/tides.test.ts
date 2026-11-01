import { describe, it, expect } from "vitest";
import { nextTides } from "@/lib/time/tides";
import type { TideEvent } from "@/lib/sources/tides";

describe("nextTides", () => {
  const now = new Date("2026-06-23T14:00:00"); // 2pm local

  const events: TideEvent[] = [
    { time: "2026-06-23 10:00", heightFt: 0.5, type: "low" },  // past
    { time: "2026-06-23 12:00", heightFt: 5.8, type: "high" }, // past
    { time: "2026-06-23 16:30", heightFt: 0.8, type: "low" },  // future
    { time: "2026-06-23 22:45", heightFt: 5.6, type: "high" }, // future (next high)
    { time: "2026-06-24 04:15", heightFt: 5.9, type: "high" }, // future (later high)
  ];

  it("returns the earliest future high and earliest future low", () => {
    const result = nextTides(events, now);
    expect(result.nextLow).toEqual({ time: "2026-06-23 16:30", heightFt: 0.8, type: "low" });
    expect(result.nextHigh).toEqual({ time: "2026-06-23 22:45", heightFt: 5.6, type: "high" });
  });

  it("returns empty object for empty input", () => {
    const result = nextTides([], now);
    expect(result).toEqual({});
  });

  it("returns only nextHigh when no future lows exist", () => {
    const highsOnly: TideEvent[] = [
      { time: "2026-06-23 10:00", heightFt: 0.5, type: "low" }, // past
      { time: "2026-06-23 22:45", heightFt: 5.6, type: "high" },
    ];
    const result = nextTides(highsOnly, now);
    expect(result.nextHigh).toBeDefined();
    expect(result.nextLow).toBeUndefined();
  });
});
