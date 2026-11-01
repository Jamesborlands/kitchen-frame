import { describe, it, expect, vi } from "vitest";
import { notableFromDaily, notableWeatherSource } from "@/lib/notice/sources/notableWeather";
import { buildContext } from "@/lib/notice/card";
import { FAMILY_LOCATIONS } from "@/lib/config";
import type { DailyForecast } from "@/lib/sources/weather";

const queenstown = FAMILY_LOCATIONS.find((l) => l.key === "queenstown")!;
const day = (over: Partial<DailyForecast>): DailyForecast => ({
  date: "2026-06-24", weatherCode: 0, tempMax: 18, tempMin: 9,
  sunrise: "", sunset: "", uvIndexMax: 4, precipitationSum: 0, ...over,
});

describe("notableFromDaily", () => {
  it("flags heavy snow (snow weather code)", () => {
    const card = notableFromDaily(queenstown, day({ weatherCode: 75 })); // heavy snow
    expect(card?.kind).toBe("weather");
    expect(card?.title.toLowerCase()).toContain("snow");
    expect(card?.priority).toBe(70);
  });
  it("flags a heatwave", () => {
    expect(notableFromDaily(queenstown, day({ tempMax: 33 }))?.title.toLowerCase()).toContain("hot");
  });
  it("returns null for ordinary weather", () => {
    expect(notableFromDaily(queenstown, day({}))).toBeNull();
  });
});

describe("notableWeatherSource", () => {
  it("returns a card when a location has notable weather today", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        current: {},
        daily: { time: ["2026-06-24"], weather_code: [75], temperature_2m_max: [-2], temperature_2m_min: [-6], sunrise: [""], sunset: [""], uv_index_max: [1], precipitation_sum: [0] },
      }),
    });
    const ctx = buildContext(new Date("2026-06-24T00:00:00Z"), [queenstown]);
    const cards = await notableWeatherSource(ctx, fetchImpl as unknown as typeof fetch);
    expect(cards[0]?.kind).toBe("weather");
  });
});
