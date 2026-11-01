import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/hooks/useWeather", () => ({
  useWeather: () => ({
    data: {
      current: {
        temperature: 20, apparentTemperature: 19, weatherCode: 0,
        windSpeed: 8, humidity: 50, uvIndex: 5, precipitation: 0,
      },
      daily: [
        {
          date: "2026-06-23",
          weatherCode: 0,
          tempMax: 21,
          tempMin: 12,
          sunrise: "2026-06-23T04:51",
          sunset: "2026-06-23T21:24",
          uvIndexMax: 6,
          precipitationSum: 0,
        },
        {
          date: "2026-06-24",
          weatherCode: 63,
          tempMax: 9,
          tempMin: 4,
          sunrise: "2026-06-24T04:52",
          sunset: "2026-06-24T21:23",
          uvIndexMax: 1,
          precipitationSum: 8,
        },
      ],
    },
    error: undefined,
    isLoading: false,
  }),
}));

import { GoodRide } from "@/components/GoodRide";

describe("GoodRide", () => {
  it("renders a weekday and 'ride' wording when a great day exists", () => {
    render(<GoodRide />);
    // The section heading
    expect(screen.getByText("a good ride")).toBeInTheDocument();
    // Should mention a weekday abbreviation
    const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const found = weekdays.some((d) => screen.queryByText(new RegExp(d, "i")) !== null);
    expect(found).toBe(true);
    // Should mention 'ride' somewhere in the content
    expect(screen.getAllByText(/ride/i).length).toBeGreaterThan(0);
  });

  it("shows the plan link to /ride", () => {
    render(<GoodRide />);
    const link = screen.getByRole("link", { name: /plan it/i });
    expect(link).toHaveAttribute("href", "/ride");
  });
});
