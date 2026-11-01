import { describe, it, expect } from "vitest";
import { hemisphereOf, isSkiSeason, watercolorSeason, seasonalScene } from "@/lib/time/season";

describe("hemisphereOf", () => {
  it("northern latitude returns north", () => {
    expect(hemisphereOf(52.37)).toBe("north");
  });

  it("southern latitude returns south", () => {
    expect(hemisphereOf(-37.14)).toBe("south");
  });

  it("equator (0) is treated as north", () => {
    expect(hemisphereOf(0)).toBe("north");
  });
});

describe("isSkiSeason — Northern hemisphere (Whistler, lat 50.12)", () => {
  const lat = 50.12;

  it("January is in ski season", () => {
    expect(isSkiSeason(new Date("2026-01-15"), lat)).toBe(true);
  });

  it("June is not in ski season", () => {
    expect(isSkiSeason(new Date("2026-06-23"), lat)).toBe(false);
  });

  it("December is in ski season", () => {
    expect(isSkiSeason(new Date("2026-12-01"), lat)).toBe(true);
  });

  it("February is in ski season", () => {
    expect(isSkiSeason(new Date("2026-02-15"), lat)).toBe(true);
  });

  it("March is in ski season", () => {
    expect(isSkiSeason(new Date("2026-03-15"), lat)).toBe(true);
  });

  it("April is in ski season", () => {
    expect(isSkiSeason(new Date("2026-04-15"), lat)).toBe(true);
  });

  it("May is NOT in ski season (shoulder month)", () => {
    expect(isSkiSeason(new Date("2026-05-15"), lat)).toBe(false);
  });
});

describe("isSkiSeason — Southern hemisphere (Queenstown, lat -37.14)", () => {
  const lat = -37.14;

  it("June 23 is in ski season (now)", () => {
    expect(isSkiSeason(new Date("2026-06-23"), lat)).toBe(true);
  });

  it("January is NOT in ski season", () => {
    expect(isSkiSeason(new Date("2026-01-15"), lat)).toBe(false);
  });

  it("July is in ski season", () => {
    expect(isSkiSeason(new Date("2026-07-15"), lat)).toBe(true);
  });

  it("August is in ski season", () => {
    expect(isSkiSeason(new Date("2026-08-15"), lat)).toBe(true);
  });

  it("September is in ski season", () => {
    expect(isSkiSeason(new Date("2026-09-15"), lat)).toBe(true);
  });

  it("October is in ski season", () => {
    expect(isSkiSeason(new Date("2026-10-15"), lat)).toBe(true);
  });

  it("November is NOT in ski season (shoulder month)", () => {
    expect(isSkiSeason(new Date("2026-11-15"), lat)).toBe(false);
  });
});

describe("watercolorSeason", () => {
  const ludlow = 52.37;   // north
  const queenstown = -37.14; // south

  it("northern hemisphere: June is summer, January is winter", () => {
    expect(watercolorSeason(new Date("2026-06-23"), ludlow)).toBe("summer");
    expect(watercolorSeason(new Date("2026-01-15"), ludlow)).toBe("winter");
  });

  it("southern hemisphere flips: June is winter (snowy), January is summer", () => {
    expect(watercolorSeason(new Date("2026-06-23"), queenstown)).toBe("winter");
    expect(watercolorSeason(new Date("2026-01-15"), queenstown)).toBe("summer");
  });

  it("northern cold half spans Nov–Apr", () => {
    expect(watercolorSeason(new Date("2026-11-15"), ludlow)).toBe("winter");
    expect(watercolorSeason(new Date("2026-04-15"), ludlow)).toBe("winter");
    expect(watercolorSeason(new Date("2026-05-15"), ludlow)).toBe("summer");
  });
});

describe("seasonalScene", () => {
  it("appends the season to the stem", () => {
    expect(seasonalScene("place-queenstown", new Date("2026-06-23"), -37.14)).toBe(
      "place-queenstown-winter",
    );
    expect(seasonalScene("place-santacruz", new Date("2026-07-01"), 36.97)).toBe(
      "place-santacruz-summer",
    );
  });
});
