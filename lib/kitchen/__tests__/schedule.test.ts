import { describe, it, expect } from "vitest";
import { isNight, londonHour, shouldReload } from "@/lib/kitchen/schedule";

// Winter dates so London = UTC.
const at = (hhmm: string) => new Date(`2026-01-15T${hhmm}:00Z`);

describe("londonHour", () => {
  it("follows British Summer Time", () => {
    expect(londonHour(new Date("2026-06-15T22:30:00Z"))).toBe(23);
  });
});

describe("isNight", () => {
  it("is night from midnight until 6am", () => {
    expect(isNight(at("23:59"))).toBe(false);
    expect(isNight(at("00:00"))).toBe(true);
    expect(isNight(at("03:00"))).toBe(true);
    expect(isNight(at("05:59"))).toBe(true);
    expect(isNight(at("06:00"))).toBe(false);
  });
  it("handles a window that doesn't cross midnight", () => {
    const s = { nightStartHour: 1, nightEndHour: 5 };
    expect(isNight(at("00:30"), s)).toBe(false);
    expect(isNight(at("02:00"), s)).toBe(true);
  });
});

describe("shouldReload", () => {
  const base = { builtVersion: "abc", liveVersion: "abc" };

  it("reloads when a new version is deployed", () => {
    expect(shouldReload({ ...base, liveVersion: "def", now: at("14:00"), loadedAt: at("13:50") })).toBe(true);
  });
  it("ignores versions it can't compare (local dev)", () => {
    expect(shouldReload({ builtVersion: null, liveVersion: "def", now: at("14:00"), loadedAt: at("13:50") })).toBe(false);
  });
  it("reloads once in the 4am hour", () => {
    expect(shouldReload({ ...base, now: at("04:05"), loadedAt: new Date("2026-01-14T04:00:00Z") })).toBe(true);
  });
  it("doesn't reload again straight after the nightly reload", () => {
    expect(shouldReload({ ...base, now: at("04:15"), loadedAt: at("04:05") })).toBe(false);
  });
  it("leaves the page alone the rest of the day", () => {
    expect(shouldReload({ ...base, now: at("14:00"), loadedAt: new Date("2026-01-14T04:00:00Z") })).toBe(false);
  });
});
