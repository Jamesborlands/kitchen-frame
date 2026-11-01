import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

const mockUseFlood = vi.fn();
const mockUseWeather = vi.fn();

vi.mock("@/lib/hooks/useFlood", () => ({
  useFlood: () => mockUseFlood(),
}));

vi.mock("@/lib/hooks/useWeather", () => ({
  useWeather: () => mockUseWeather(),
}));

// Next.js Link needs mocking in jsdom
vi.mock("next/link", () => ({
  default: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => (
    <a href={href} className={className}>{children}</a>
  ),
}));

import FloodPage from "@/app/flood/page";

const FLOOD_DATA = {
  warnings: [
    {
      severity: "Flood Alert",
      severityLevel: 3,
      description: "River Teme at Ludlow",
      message: "Minor flooding possible.",
      area: "River Teme",
    },
  ],
  rivers: [
    {
      station: "Ludlow",
      river: "River Teme",
      level: 0.42,
      unit: "m",
      history: [0.38, 0.39, 0.40, 0.41, 0.42],
    },
    {
      station: "Ludlow Corve",
      river: "River Corve",
      level: 0.31,
      unit: "m",
      history: [0.30, 0.30, 0.31, 0.31, 0.31],
    },
  ],
};

const WEATHER_DATA = {
  current: {
    temperature: 18,
    apparentTemperature: 17,
    weatherCode: 0,
    windSpeed: 8,
    humidity: 55,
    uvIndex: 4,
    precipitation: 0,
  },
  daily: [
    {
      date: "2026-06-23",
      weatherCode: 61,
      tempMax: 18,
      tempMin: 11,
      sunrise: "2026-06-23T04:51",
      sunset: "2026-06-23T21:24",
      uvIndexMax: 3,
      precipitationSum: 4.2,
    },
    {
      date: "2026-06-24",
      weatherCode: 63,
      tempMax: 15,
      tempMin: 10,
      sunrise: "2026-06-24T04:52",
      sunset: "2026-06-24T21:23",
      uvIndexMax: 1,
      precipitationSum: 9.8,
    },
    {
      date: "2026-06-25",
      weatherCode: 0,
      tempMax: 21,
      tempMin: 13,
      sunrise: "2026-06-25T04:53",
      sunset: "2026-06-25T21:22",
      uvIndexMax: 6,
      precipitationSum: 0,
    },
  ],
};

describe("FloodPage", () => {
  beforeEach(() => {
    mockUseFlood.mockReturnValue({ data: FLOOD_DATA, error: undefined, isLoading: false });
    mockUseWeather.mockReturnValue({ data: WEATHER_DATA, error: undefined, isLoading: false });
  });

  it("renders the flood watch heading", () => {
    render(<FloodPage />);
    expect(screen.getByRole("heading", { name: /flood watch/i })).toBeInTheDocument();
  });

  it("renders the rivers intro text", () => {
    render(<FloodPage />);
    expect(screen.getAllByText(/teme/i).length).toBeGreaterThan(0);
  });

  it("renders a warning severity", () => {
    render(<FloodPage />);
    expect(screen.getByText(/flood alert/i)).toBeInTheDocument();
  });

  it("renders River Teme in the rivers section", () => {
    render(<FloodPage />);
    // River name appears in river cards
    const temeEls = screen.getAllByText(/river teme/i);
    expect(temeEls.length).toBeGreaterThan(0);
  });

  it("renders River Corve", () => {
    render(<FloodPage />);
    expect(screen.getByText(/river corve/i)).toBeInTheDocument();
  });

  it("renders a rainfall weekday from the forecast", () => {
    render(<FloodPage />);
    // "Tue", "Wed", "Thu" etc. — at least one short weekday abbreviation must appear
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const found = days.some((d) => screen.queryByText(d) !== null);
    expect(found).toBe(true);
  });

  it("shows precipitation amount from weather data", () => {
    render(<FloodPage />);
    expect(screen.getByText(/4\.2 mm/i)).toBeInTheDocument();
  });

  it("renders a back link to home", () => {
    render(<FloodPage />);
    const link = screen.getByRole("link", { name: /home/i });
    expect(link).toHaveAttribute("href", "/");
  });

  it("shows 'no flood warnings' when warnings array is empty", () => {
    mockUseFlood.mockReturnValue({
      data: { warnings: [], rivers: [] },
      error: undefined,
      isLoading: false,
    });
    render(<FloodPage />);
    expect(screen.getByText(/no flood warnings right now/i)).toBeInTheDocument();
  });

  it("shows a friendly loading message while flood data loads", () => {
    mockUseFlood.mockReturnValue({ data: undefined, error: undefined, isLoading: true });
    render(<FloodPage />);
    expect(screen.getByText(/checking warnings/i)).toBeInTheDocument();
  });
});
