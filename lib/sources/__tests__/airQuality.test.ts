import { describe, it, expect } from "vitest";
import { buildAirQualityUrl, parseAirQuality, peakForDay } from "@/lib/sources/airQuality";
import fixture from "@/lib/sources/__fixtures__/air-quality.json";

describe("buildAirQualityUrl", () => {
  it("targets the air-quality host with pollen fields", () => {
    const url = buildAirQualityUrl(52.3675, -2.7181, "Europe/London");
    expect(url).toContain("air-quality-api.open-meteo.com");
    expect(url).toContain("european_aqi");
    expect(url).toContain("grass_pollen");
  });
});

describe("parseAirQuality", () => {
  it("reads the latest hourly sample", () => {
    const r = parseAirQuality(fixture);
    expect(r.europeanAqi).toBe(24);
    expect(r.grassPollen).toBe(21);
    expect(r.birchPollen).toBe(0);
  });
});

describe("peakForDay", () => {
  const json = {
    hourly: {
      time: ["2026-06-23T10:00", "2026-06-23T15:00", "2026-06-24T15:00"],
      european_aqi: [22, 41, 90],
      grass_pollen: [18, 64, 200],
      birch_pollen: [null, 0, 5],
    },
  };
  it("takes the worst hour of the given day only", () => {
    expect(peakForDay(json, "2026-06-23")).toEqual({ europeanAqi: 41, grassPollen: 64, birchPollen: 0 });
  });
  it("is null for a day with no samples", () => {
    expect(peakForDay(json, "2026-06-30")).toEqual({ europeanAqi: null, grassPollen: null, birchPollen: null });
  });
});
