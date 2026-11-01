import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/hooks/useWeather", () => ({
  useWeather: () => ({
    data: { current: {}, daily: [
      { date: "2026-06-23", weatherCode: 0, tempMax: 21, tempMin: 12, sunrise: "", sunset: "", uvIndexMax: 5, precipitationSum: 0 },
      { date: "2026-06-24", weatherCode: 61, tempMax: 19, tempMin: 11, sunrise: "", sunset: "", uvIndexMax: 4, precipitationSum: 3 },
    ] },
    error: undefined, isLoading: false,
  }),
}));

import { Forecast7Day } from "@/components/Forecast7Day";

describe("Forecast7Day", () => {
  it("renders a row per day with max/min", () => {
    render(<Forecast7Day />);
    expect(screen.getByText(/21°/)).toBeInTheDocument();
    expect(screen.getByText(/12°/)).toBeInTheDocument();
  });
});
