import { describe, it, expect } from "vitest";
import { buildWeatherUrl, parseWeather } from "@/lib/sources/weather";
import fixture from "@/lib/sources/__fixtures__/open-meteo.json";

describe("buildWeatherUrl", () => {
  it("includes coords, timezone, current/daily params and 7 days", () => {
    const url = buildWeatherUrl(52.3675, -2.7181, "Europe/London");
    expect(url).toContain("latitude=52.3675");
    expect(url).toContain("longitude=-2.7181");
    expect(url).toContain("timezone=Europe%2FLondon");
    expect(url).toContain("forecast_days=7");
    expect(url).toContain("weather_code");
    expect(url).toContain("sunrise");
  });
});

describe("parseWeather", () => {
  it("maps current conditions", () => {
    const d = parseWeather(fixture);
    expect(d.current.temperature).toBe(18.4);
    expect(d.current.weatherCode).toBe(3);
    expect(d.current.uvIndex).toBe(4.1);
    expect(d.current.humidity).toBe(64);
  });
  it("maps the daily array in order", () => {
    const d = parseWeather(fixture);
    expect(d.daily).toHaveLength(2);
    expect(d.daily[0]).toMatchObject({
      date: "2026-06-23", weatherCode: 3, tempMax: 21.5, tempMin: 12.1,
      sunrise: "2026-06-23T04:51", sunset: "2026-06-23T21:24",
    });
    expect(d.daily[1].weatherCode).toBe(61);
  });
});

describe("parseWeather hourly", () => {
  it("extracts the hourly series when present", () => {
    const data = parseWeather({
      current: { temperature_2m: 20, apparent_temperature: 21, weather_code: 1, wind_speed_10m: 5, relative_humidity_2m: 50, uv_index: 4, precipitation: 0 },
      daily: { time: ["2026-06-25"], weather_code: [1], temperature_2m_max: [24], temperature_2m_min: [12], sunrise: [""], sunset: [""], uv_index_max: [5], precipitation_sum: [0] },
      hourly: {
        time: ["2026-06-25T09:00", "2026-06-25T10:00"],
        temperature_2m: [18, 20],
        precipitation_probability: [10, null],
        weather_code: [2, 3],
      },
    });
    expect(data.hourly).toHaveLength(2);
    expect(data.hourly[0]).toEqual({ time: "2026-06-25T09:00", temp: 18, precipProbability: 10, weatherCode: 2 });
    expect(data.hourly[1].precipProbability).toBe(0); // null → 0
  });

  it("defaults hourly to [] when absent", () => {
    const data = parseWeather({
      current: { temperature_2m: 20, apparent_temperature: 21, weather_code: 1, wind_speed_10m: 5, relative_humidity_2m: 50, uv_index: 4, precipitation: 0 },
      daily: { time: ["2026-06-25"], weather_code: [1], temperature_2m_max: [24], temperature_2m_min: [12], sunrise: [""], sunset: [""], uv_index_max: [5], precipitation_sum: [0] },
    });
    expect(data.hourly).toEqual([]);
  });
});
