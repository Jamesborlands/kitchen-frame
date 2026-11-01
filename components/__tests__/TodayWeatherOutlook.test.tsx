import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const NOW = new Date("2026-06-23T09:00:00Z"); // 10am in Ludlow (BST)

vi.mock("@/lib/hooks/useWeather", () => ({
  useWeather: () => ({
    data: {
      current: { temperature: 18, apparentTemperature: 17, weatherCode: 3, windSpeed: 10, humidity: 60, uvIndex: 4, precipitation: 0 },
      daily: [{ date: "2026-06-23", weatherCode: 3, tempMax: 21, tempMin: 12, sunrise: "2026-06-23T04:51", sunset: "2026-06-23T21:24", uvIndexMax: 5, precipitationSum: 2 }],
      hourly: Array.from({ length: 24 }, (_, i) => ({
        time: `2026-06-23T${String(i).padStart(2, "0")}:00`, temp: 18, weatherCode: 3,
        precipProbability: i >= 15 ? 70 : 5,
      })),
      fetchedAt: NOW.getTime() - 2 * 60 * 60_000,
    },
    error: undefined, isLoading: false,
  }),
}));

import { TodayWeather } from "@/components/TodayWeather";

describe("TodayWeather outlook", () => {
  beforeEach(() => { vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(NOW); });
  afterEach(() => { vi.useRealTimers(); });

  it("shows today's high, low and when rain is due", () => {
    render(<TodayWeather />);
    expect(screen.getByText("high 21° · low 12° · rain likely from 3pm")).toBeInTheDocument();
  });

  it("flags weather data that's gone stale", () => {
    render(<TodayWeather />);
    expect(screen.getByText("updated 2h ago")).toBeInTheDocument();
  });
});
