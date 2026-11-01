import { describe, it, expect } from "vitest";
import { hourLabel, londonHourKey, rainOutlook, todayOutlook } from "@/lib/weather/today";
import type { DailyForecast, HourlyForecast } from "@/lib/sources/weather";

// Hourly probabilities for 2026-06-23 from 00:00, plus one hour of the next day.
function hours(probs: number[]): HourlyForecast[] {
  const out = probs.map((p, i) => ({
    time: `2026-06-23T${String(i).padStart(2, "0")}:00`, temp: 15, precipProbability: p, weatherCode: 3,
  }));
  out.push({ time: "2026-06-24T00:00", temp: 12, precipProbability: 90, weatherCode: 61 });
  return out;
}
const dry = Array(24).fill(5);

describe("hourLabel", () => {
  it("formats 12-hour labels", () => {
    expect(hourLabel("2026-06-23T00:00")).toBe("12am");
    expect(hourLabel("2026-06-23T09:00")).toBe("9am");
    expect(hourLabel("2026-06-23T12:00")).toBe("12pm");
    expect(hourLabel("2026-06-23T15:00")).toBe("3pm");
  });
});

describe("londonHourKey", () => {
  it("reads the Ludlow wall-clock hour (BST in summer)", () => {
    expect(londonHourKey(new Date("2026-06-23T14:30:00Z"))).toBe("2026-06-23T15");
  });
  it("uses 00 for midnight, not 24", () => {
    expect(londonHourKey(new Date("2026-01-10T00:10:00Z"))).toBe("2026-01-10T00");
  });
});

describe("rainOutlook", () => {
  it("names the hour rain becomes likely", () => {
    const p = [...dry]; p[15] = 60; p[16] = 70;
    expect(rainOutlook(hours(p), "2026-06-23T10")).toBe("rain likely from 3pm");
  });
  it("says when current rain should clear", () => {
    const p = [...dry]; p[10] = 80; p[11] = 60; p[12] = 25;
    expect(rainOutlook(hours(p), "2026-06-23T10")).toBe("rain until 12pm");
  });
  it("covers rain that lasts the rest of the day", () => {
    const p = Array(24).fill(80);
    expect(rainOutlook(hours(p), "2026-06-23T20")).toBe("rain for the rest of the day");
  });
  it("says staying dry when every remaining hour is low", () => {
    expect(rainOutlook(hours(dry), "2026-06-23T08")).toBe("staying dry");
  });
  it("ignores rain in hours already gone and tomorrow", () => {
    const p = [...dry]; p[6] = 90;
    expect(rainOutlook(hours(p), "2026-06-23T09")).toBe("staying dry");
  });
  it("stays quiet when it's showery but not likely", () => {
    const p = [...dry]; p[14] = 35;
    expect(rainOutlook(hours(p), "2026-06-23T09")).toBeNull();
  });
  it("returns null with no hours left today", () => {
    expect(rainOutlook(hours(dry), "2026-06-25T09")).toBeNull();
  });
});

describe("todayOutlook", () => {
  const today: DailyForecast = {
    date: "2026-06-23", weatherCode: 3, tempMax: 20.6, tempMin: 11.6,
    sunrise: "", sunset: "", uvIndexMax: 5, precipitationSum: 0,
  };
  it("rounds the high and low", () => {
    expect(todayOutlook(today, hours(dry), "2026-06-23T09")).toEqual({ high: 21, low: 12, rain: "staying dry" });
  });
  it("copes with no hourly data", () => {
    expect(todayOutlook(today, undefined, "2026-06-23T09").rain).toBeNull();
  });
});
