import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/hooks/useWeather", () => ({
  useWeather: () => ({
    data: { current: { temperature: 18, apparentTemperature: 17, weatherCode: 3, windSpeed: 10, humidity: 60, uvIndex: 4, precipitation: 0 },
      daily: [{ date: "2026-06-23", weatherCode: 3, tempMax: 21, tempMin: 12, sunrise: "2026-06-23T04:51", sunset: "2026-06-23T21:24", uvIndexMax: 5, precipitationSum: 0 }] },
    error: undefined, isLoading: false,
  }),
}));

import DashboardPage from "@/app/page";
import KitchenPage from "@/app/kitchen/page";

describe("pages", () => {
  it("dashboard renders core sections", () => {
    render(<DashboardPage />);
    expect(screen.getByText("today in ludlow")).toBeInTheDocument();
    expect(screen.getByText("walks")).toBeInTheDocument();
  });
  it("kitchen renders the glanceable core", () => {
    render(<KitchenPage />);
    expect(screen.getByText("today in ludlow")).toBeInTheDocument();
  });
});
