import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/hooks/useTides", () => ({
  useTides: vi.fn(() => ({
    events: [
      { time: "2026-06-23 16:30", heightFt: 0.8, type: "low" as const },
      { time: "2026-06-23 22:45", heightFt: 5.6, type: "high" as const },
    ],
    error: undefined,
    isLoading: false,
  })),
}));

vi.mock("@/lib/hooks/useWaves", () => ({
  useWaves: vi.fn(() => ({
    data: {
      waveHeightFt: 3.2,
      periodSec: 15,
      directionDeg: 270,
      waterTempF: 66,
    },
    error: undefined,
    isLoading: false,
  })),
}));

vi.mock("@/lib/hooks/useWeather", () => ({
  useWeather: vi.fn(() => ({
    data: {
      current: {
        temperature: 22,
        apparentTemperature: 21,
        weatherCode: 1,
        windSpeed: 8,
        humidity: 70,
        uvIndex: 6,
        precipitation: 0,
      },
      daily: [
        {
          date: "2026-06-23",
          weatherCode: 1,
          tempMax: 24,
          tempMin: 16,
          sunrise: "2026-06-23T05:42",
          sunset: "2026-06-23T20:01",
          uvIndexMax: 7,
          precipitationSum: 0,
        },
      ],
    },
    error: undefined,
    isLoading: false,
  })),
}));

vi.mock("@/lib/hooks/useNow", () => ({
  useNow: () => new Date("2026-06-23T14:00:00Z"),
}));

import { LocationDetail } from "@/components/LocationDetail";
import { FAMILY_LOCATIONS } from "@/lib/config";
import { useWeather } from "@/lib/hooks/useWeather";

const santacruzLocation = FAMILY_LOCATIONS.find((l) => l.key === "santaCruz");
if (!santacruzLocation) throw new Error("santaCruz missing from FAMILY_LOCATIONS");

describe("LocationDetail", () => {
  it("renders Santa Cruz location detail", () => {
    render(<LocationDetail location={santacruzLocation} />);
    expect(screen.getByText("Santa Cruz")).toBeInTheDocument();
    expect(screen.getByText("Sam")).toBeInTheDocument();
    expect(screen.getByText("sea & surf")).toBeInTheDocument();
  });

  it("shows sunrise and sunset in the place's own time, whatever the viewer's timezone", () => {
    render(<LocationDetail location={santacruzLocation} />);
    expect(screen.getByText(/↑ 5:42 AM/)).toBeInTheDocument();
    expect(screen.getByText(/↓ 8:01 PM/)).toBeInTheDocument();
  });

  it("renders loading fallback when weather is loading", () => {
    vi.mocked(useWeather).mockReturnValueOnce({
      data: undefined,
      isLoading: true,
      error: undefined,
    });
    render(<LocationDetail location={santacruzLocation} />);
    expect(screen.getByText("weather loading…")).toBeInTheDocument();
  });
});
