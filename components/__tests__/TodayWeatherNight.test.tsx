/**
 * Night watercolour test — separate file so the useNow mock is scoped here
 * and does not interfere with the existing daytime TodayWeather.test.tsx.
 *
 * At 2026-06-23T23:30:00Z (UTC) → BST is UTC+1 → 00:30 next day = 30 minutes.
 * Sunrise local "04:51" → 291 min.  30 < 291  →  isNight = true.
 */
import { render } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/hooks/useNow", () => ({
  useNow: () => new Date("2026-06-23T23:30:00Z"),
}));

vi.mock("@/lib/hooks/useWeather", () => ({
  useWeather: () => ({
    data: {
      current: {
        temperature: 14,
        apparentTemperature: 12,
        weatherCode: 0,
        windSpeed: 5,
        humidity: 70,
        uvIndex: 0,
        precipitation: 0,
      },
      daily: [
        {
          date: "2026-06-23",
          weatherCode: 0,
          tempMax: 22,
          tempMin: 12,
          sunrise: "2026-06-23T04:51",
          sunset: "2026-06-23T21:24",
          uvIndexMax: 0,
          precipitationSum: 0,
        },
      ],
    },
    error: undefined,
    isLoading: false,
  }),
}));

import { TodayWeather } from "@/components/TodayWeather";

describe("TodayWeather – night mode", () => {
  it("renders the night watercolour image when the sun is down", () => {
    const { container } = render(<TodayWeather />);
    const img = container.querySelector('img[src="/watercolor/night-summer.webp"]');
    expect(img).not.toBeNull();
  });
});
