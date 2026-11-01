import { describe, expect, it } from "vitest";
import { weatherAdvice } from "@/lib/notice/sources/weatherAdvice";
import type { DailyForecast, HourlyForecast } from "@/lib/sources/weather";

const hours = (date: string, probs: Record<number, number>): HourlyForecast[] =>
  Array.from({ length: 24 }, (_, h) => ({ time: `${date}T${String(h).padStart(2, "0")}:00`, temp: 10, weatherCode: 3, precipProbability: probs[h] ?? 5 }));
const day = (date: string, tempMin: number): DailyForecast => ({
  date, weatherCode: 3, tempMax: 12, tempMin, sunrise: `${date}T07:20`, sunset: `${date}T18:20`, uvIndexMax: 1, precipitationSum: 0,
});
const days = (tonightMin = 5) => [day("2026-10-12", 6), day("2026-10-13", tonightMin)];
const titles = (h: HourlyForecast[], now: string, tonightMin?: number) => weatherAdvice(h, days(tonightMin), now).map((c) => c.title);

describe("weatherAdvice", () => {
  it("warns about rain later today", () => {
    expect(titles(hours("2026-10-12", { 15: 70, 16: 80 }), "2026-10-12T09:10")).toEqual(["Rain likely from 3pm — take a coat if you're heading out."]);
  });

  it("raining now, with a drier spell later", () => {
    expect(titles(hours("2026-10-12", { 9: 80, 10: 75, 11: 30 }), "2026-10-12T09:40")).toEqual(["Rain about now — drier from 11am."]);
  });

  it("raining now and all day", () => {
    const wet = Object.fromEntries(Array.from({ length: 24 }, (_, h) => [h, 85]));
    expect(titles(hours("2026-10-12", wet), "2026-10-12T09:00")).toEqual(["Rain on and off for the rest of the day."]);
  });

  it("says nothing on a dry day, or about rain after 9pm", () => {
    expect(titles(hours("2026-10-12", {}), "2026-10-12T09:00")).toEqual([]);
    expect(titles(hours("2026-10-12", { 22: 90 }), "2026-10-12T09:00")).toEqual([]);
  });

  it("says nothing late in the evening", () => {
    expect(titles(hours("2026-10-12", { 21: 90, 22: 90 }), "2026-10-12T21:30")).toEqual([]);
  });

  it("frost tonight, from midday on", () => {
    expect(titles(hours("2026-10-12", {}), "2026-10-12T14:00", -2.4)).toEqual(["Frost tonight — down to -2°."]);
    expect(titles(hours("2026-10-12", {}), "2026-10-12T09:00", -2.4)).toEqual([]);
    expect(titles(hours("2026-10-12", {}), "2026-10-12T14:00", 1)).toEqual([]);
  });

  it("cards are weather cards for home, ranked above the everyday ones", () => {
    const [c] = weatherAdvice(hours("2026-10-12", { 15: 70 }), days(), "2026-10-12T09:00");
    expect(c).toMatchObject({ kind: "weather", label: "ludlow" });
    expect(c.priority).toBeGreaterThanOrEqual(70);
  });
});
