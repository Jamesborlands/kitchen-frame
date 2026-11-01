import { describe, it, expect } from "vitest";
import { bestWalkWindow, hourScore } from "@/lib/weather/walk";
import type { DailyForecast, HourlyForecast } from "@/lib/sources/weather";

const today: DailyForecast = {
  date: "2026-06-25",
  weatherCode: 1,
  tempMax: 24,
  tempMin: 12,
  sunrise: "2026-06-25T05:00",
  sunset: "2026-06-25T21:00",
  uvIndexMax: 6,
  precipitationSum: 0,
};

const hour = (h: number, over: Partial<HourlyForecast> = {}): HourlyForecast => ({
  time: `2026-06-25T${String(h).padStart(2, "0")}:00`,
  temp: 16,
  precipProbability: 0,
  weatherCode: 1,
  ...over,
});

describe("hourScore", () => {
  it("scores a dry, mild hour higher than a wet, cold one", () => {
    expect(hourScore(hour(12, { precipProbability: 0, temp: 16, weatherCode: 1 }))).toBeGreaterThan(
      hourScore(hour(12, { precipProbability: 80, temp: 3, weatherCode: 61 })),
    );
  });
});

describe("bestWalkWindow", () => {
  it("picks the driest, mildest daylight window and labels it good", () => {
    const hourly = [
      hour(9, { precipProbability: 70, temp: 13, weatherCode: 61 }), // wet
      hour(10, { precipProbability: 60, temp: 14, weatherCode: 61 }),
      hour(16, { precipProbability: 0, temp: 19, weatherCode: 1 }), // lovely
      hour(17, { precipProbability: 0, temp: 18, weatherCode: 2 }),
    ];
    const w = bestWalkWindow(hourly, today, "2026-06-25T08");
    expect(w).not.toBeNull();
    expect(w!.start).toBe("2026-06-25T16:00");
    expect(w!.end).toBe("2026-06-25T18:00");
    expect(w!.tone).toBe("good");
    expect(w!.summary).toBe("dry & 19°");
  });

  it("skips hours already passed (before nowKey)", () => {
    const hourly = [
      hour(7, { precipProbability: 0, temp: 18 }), // before now
      hour(15, { precipProbability: 0, temp: 18 }),
    ];
    const w = bestWalkWindow(hourly, today, "2026-06-25T14");
    expect(w!.start).toBe("2026-06-25T15:00");
  });

  it("excludes hours outside daylight", () => {
    const hourly = [hour(3, { precipProbability: 0, temp: 16 })]; // before sunrise (05:00)
    expect(bestWalkWindow(hourly, today, "2026-06-25T00")).toBeNull();
  });

  it("treats a heatwave as not-good and flags it for the dog", () => {
    const hourly = [
      hour(12, { precipProbability: 0, temp: 33, weatherCode: 0 }),
      hour(13, { precipProbability: 0, temp: 34, weatherCode: 0 }),
    ];
    const w = bestWalkWindow(hourly, today, "2026-06-25T08")!;
    expect(w.tone).not.toBe("good");
    expect(w.summary).toMatch(/hot at \d+° — keep it shady/);
  });

  it("flags a grim day", () => {
    const hourly = [
      hour(12, { precipProbability: 90, temp: 4, weatherCode: 95 }),
      hour(13, { precipProbability: 90, temp: 4, weatherCode: 95 }),
    ];
    expect(bestWalkWindow(hourly, today, "2026-06-25T08")!.tone).toBe("grim");
  });
});
