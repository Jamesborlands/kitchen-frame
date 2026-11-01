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

import RidePage from "@/app/ride/page";

describe("RidePage", () => {
  it("renders the page heading", () => {
    render(<RidePage />);
    expect(screen.getByRole("heading", { name: /plan your cycle ride/i })).toBeInTheDocument();
  });

  it("renders at least one verdict word (great, good, ok, or poor)", () => {
    render(<RidePage />);
    const hasVerdict =
      screen.queryAllByText(/^(great|good|ok|poor)$/i).length > 0;
    expect(hasVerdict).toBe(true);
  });

  it("renders a back link to home", () => {
    render(<RidePage />);
    expect(screen.getByRole("link", { name: /home/i })).toBeInTheDocument();
  });

  it("renders the route planner link to /map", () => {
    render(<RidePage />);
    const link = screen.getByRole("link", { name: /route planner/i });
    expect(link).toHaveAttribute("href", "/map");
  });
});
