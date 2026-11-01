import { describe, it, expect } from "vitest";
import { snowPoint, buildSnowUrl, parseSnow } from "@/lib/sources/snow";
import fixture from "@/lib/sources/__fixtures__/open-meteo-snow.json";

describe("buildSnowUrl", () => {
  it("includes host, hourly=snow_depth, daily=snowfall_sum, past_days=3, and encoded timezone", () => {
    const url = buildSnowUrl(-45.0569, 168.8167, "Pacific/Auckland");
    expect(url).toContain("api.open-meteo.com");
    expect(url).toContain("hourly=snow_depth");
    expect(url).toContain("daily=snowfall_sum");
    expect(url).toContain("past_days=3");
    expect(url).toContain("timezone=Pacific%2FAuckland");
    expect(url).toContain("latitude=-45.0569");
    expect(url).toContain("longitude=168.8167");
  });
});

describe("parseSnow", () => {
  it("returns latest non-null snow_depth converted from metres to cm", () => {
    // fixture: [0.12, 0.0, 0.15, 0.18, null] — latest non-null is index 3 = 0.18 m → 18 cm
    const result = parseSnow(fixture);
    expect(result.snowDepthCm).toBe(18);
  });

  it("does not skip 0 when scanning for latest non-null", () => {
    const input = {
      hourly: {
        time: ["2026-06-20T00:00", "2026-06-20T01:00"],
        snow_depth: [0.5, 0],
      },
      daily: { time: ["2026-06-20"], snowfall_sum: [1.0] },
    };
    const result = parseSnow(input);
    // 0 m × 100 = 0 cm — must NOT skip 0
    expect(result.snowDepthCm).toBe(0);
  });

  it("sums daily snowfall_sum values and rounds to 1 dp", () => {
    // fixture: [5.0, 0.0, 2.5] → sum = 7.5
    const result = parseSnow(fixture);
    expect(result.recentSnowfallCm).toBe(7.5);
  });

  it("returns null snowDepthCm when all hourly values are null", () => {
    const input = {
      hourly: { time: ["2026-06-20T00:00"], snow_depth: [null] },
      daily: { time: [], snowfall_sum: [] },
    };
    const result = parseSnow(input);
    expect(result.snowDepthCm).toBeNull();
  });

  it("returns null recentSnowfallCm on empty daily array", () => {
    const input = {
      hourly: { time: [], snow_depth: [] },
      daily: { time: [], snowfall_sum: [] },
    };
    const result = parseSnow(input);
    expect(result.recentSnowfallCm).toBeNull();
  });

  it("returns nulls on completely empty input", () => {
    const result = parseSnow({});
    expect(result.snowDepthCm).toBeNull();
    expect(result.recentSnowfallCm).toBeNull();
  });
});

describe("snowPoint", () => {
  it("reads a ski town's snow up on its ski field", () => {
    expect(snowPoint(-45.0312, 168.6626)).toEqual([-45.0569, 168.8167]);
    expect(snowPoint(50.1163, -122.9574)).toEqual([50.0592, -122.9486]);
  });
  it("leaves anywhere else where it is", () => {
    expect(snowPoint(52.3675, -2.7181)).toEqual([52.3675, -2.7181]);
  });
});
