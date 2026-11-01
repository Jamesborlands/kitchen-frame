import { describe, it, expect } from "vitest";
import { rateRideDay, rateRideDays, bestRideDay } from "@/lib/cycle/rideability";
import type { DailyForecast } from "@/lib/sources/weather";

const DRY_MILD: DailyForecast = {
  date: "2026-06-23",       // Tuesday in Europe/London
  weatherCode: 0,            // clear sky → watercolor "clear"
  tempMax: 19,
  tempMin: 12,
  sunrise: "2026-06-23T04:51",
  sunset: "2026-06-23T21:24",
  uvIndexMax: 6,
  precipitationSum: 0,
};

const WET_COLD: DailyForecast = {
  date: "2026-06-24",
  weatherCode: 63,           // rain → watercolor "rain"
  tempMax: 8,
  tempMin: 3,
  sunrise: "2026-06-24T04:52",
  sunset: "2026-06-24T21:23",
  uvIndexMax: 1,
  precipitationSum: 8,
};

describe("rateRideDay", () => {
  it("scores a dry mild day as 'great' with a high score", () => {
    const result = rateRideDay(DRY_MILD);
    expect(result.verdict).toBe("great");
    expect(result.score).toBeGreaterThanOrEqual(75);
  });

  it("scores a wet cold day as 'poor' with a low score", () => {
    const result = rateRideDay(WET_COLD);
    expect(result.verdict).toBe("poor");
    expect(result.score).toBeLessThan(35);
  });

  it("maps the correct weekday for 2026-06-23 (Tuesday)", () => {
    const result = rateRideDay(DRY_MILD);
    expect(result.weekday).toBe("Tue");
  });

  it("exposes date, tempMax, and precip on the result", () => {
    const result = rateRideDay(DRY_MILD);
    expect(result.date).toBe("2026-06-23");
    expect(result.tempMax).toBe(19);
    expect(result.precip).toBe(0);
  });

  it("clamps score to 0 on an extreme day", () => {
    const extreme: DailyForecast = {
      ...WET_COLD,
      precipitationSum: 100,
      tempMax: -10,
      weatherCode: 95,
    };
    const result = rateRideDay(extreme);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });
});

describe("rateRideDays", () => {
  it("returns same count and preserves date order", () => {
    const results = rateRideDays([DRY_MILD, WET_COLD]);
    expect(results).toHaveLength(2);
    expect(results[0].date).toBe("2026-06-23");
    expect(results[1].date).toBe("2026-06-24");
  });
});

describe("bestRideDay", () => {
  it("returns the highest-scoring day", () => {
    const best = bestRideDay([WET_COLD, DRY_MILD]);
    expect(best?.date).toBe("2026-06-23");
  });

  it("returns undefined for an empty array", () => {
    expect(bestRideDay([])).toBeUndefined();
  });

  it("returns earliest day on tie", () => {
    const same: DailyForecast = { ...DRY_MILD, date: "2026-06-25" };
    const result = bestRideDay([DRY_MILD, same]);
    expect(result?.date).toBe("2026-06-23");
  });
});
