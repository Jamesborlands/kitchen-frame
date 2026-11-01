import { describe, it, expect } from "vitest";
import { readClock, wallClockMinutes } from "@/lib/time/clocks";

// 2026-06-23T12:00:00Z. UK summer = BST (13:00). LA = PDT (05:00). Queenstown = NZST (22:00 at 10:00Z).
const noonUTC = new Date("2026-06-23T12:00:00Z");

describe("readClock", () => {
  it("renders BST local time for London", () => {
    const r = readClock("Europe/London", noonUTC);
    expect(r.hour24).toBe(13);
    expect(r.time).toBe("1:00");
    expect(r.suffix).toBe("pm");
    expect(r.callHint).toBe("good");
  });
  it("renders PDT local time for Santa Cruz and flags early morning", () => {
    const r = readClock("America/Los_Angeles", noonUTC);
    expect(r.hour24).toBe(5);
    expect(r.callHint).toBe("asleep");
  });
  it("renders NZST local time for Queenstown at night", () => {
    const r = readClock("Pacific/Auckland", new Date("2026-06-23T10:00:00Z"));
    expect(r.hour24).toBe(22);
    expect(r.suffix).toBe("pm");
    expect(r.callHint).toBe("maybe");
  });
  it("classifies a comfortable afternoon as good", () => {
    const r = readClock("Europe/London", new Date("2026-06-23T14:00:00Z")); // 15:00 BST
    expect(r.callHint).toBe("good");
  });
});

describe("wallClockMinutes", () => {
  // 2026-06-23T12:00:00Z = 13:00 BST = 5:00 PDT
  it("returns 13*60 for Europe/London in summer (BST)", () => {
    expect(wallClockMinutes("Europe/London", noonUTC)).toBe(13 * 60);
  });
  it("returns 5*60 for America/Los_Angeles in summer (PDT)", () => {
    expect(wallClockMinutes("America/Los_Angeles", noonUTC)).toBe(5 * 60);
  });
  it("returns correct minutes for a non-zero minute value", () => {
    // 2026-06-23T12:34:00Z = 13:34 BST = 780+34 = 814
    const t = new Date("2026-06-23T12:34:00Z");
    expect(wallClockMinutes("Europe/London", t)).toBe(13 * 60 + 34);
  });
});

describe("callHint boundary coverage", () => {
  // Use Europe/London in winter (UTC+0 = GMT) so UTC hour == local hour, for easy reasoning.
  // 2026-01-15 is a Thursday in January (GMT, UTC+0 offset).
  function atHour(h: number): Date {
    return new Date(`2026-01-15T${String(h).padStart(2, "0")}:00:00Z`);
  }

  const cases: [number, string][] = [
    [9,  "good"],   // lower bound of good
    [20, "good"],   // upper bound of good (20 < 21)
    [8,  "maybe"],  // upper maybe-morning boundary
    [7,  "maybe"],  // lower maybe-morning boundary
    [21, "maybe"],  // lower maybe-evening boundary
    [22, "maybe"],  // upper maybe-evening boundary (22 < 23)
    [23, "asleep"], // just past maybe-evening
    [6,  "asleep"], // just below maybe-morning
    [0,  "asleep"], // midnight
  ];

  for (const [hour, expected] of cases) {
    it(`hour ${hour} → ${expected}`, () => {
      expect(readClock("Europe/London", atHour(hour)).callHint).toBe(expected);
    });
  }
});
