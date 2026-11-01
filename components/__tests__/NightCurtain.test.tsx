import { render, screen, fireEvent, act } from "@testing-library/react";
import { describe, it, expect, vi, afterEach } from "vitest";

vi.mock("@/lib/hooks/useWeather", () => ({
  useWeather: () => ({ data: { current: { temperature: 9.4, weatherCode: 0 }, daily: [], hourly: [] } }),
}));

import { NightCurtain } from "@/components/NightCurtain";

afterEach(() => vi.useRealTimers());

function at(iso: string) {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(iso));
}

describe("NightCurtain", () => {
  it("stays out of the way during the day", () => {
    at("2026-01-15T14:00:00Z");
    render(<NightCurtain />);
    expect(screen.queryByRole("button", { name: /night mode/ })).toBeNull();
  });

  it("covers the screen with a dim clock overnight", () => {
    at("2026-01-16T00:40:00Z");
    render(<NightCurtain />);
    expect(screen.getByRole("button", { name: /night mode/ })).toBeInTheDocument();
    expect(screen.getByText("12:40")).toBeInTheDocument();
    expect(screen.getByText("friday 16 january")).toBeInTheDocument();
    expect(screen.getByText(/9°/)).toBeInTheDocument();
  });

  it("wakes on a tap, then dims again after five minutes", () => {
    at("2026-01-16T00:40:00Z");
    render(<NightCurtain />);
    fireEvent.click(screen.getByRole("button", { name: /night mode/ }));
    expect(screen.queryByRole("button", { name: /night mode/ })).toBeNull();
    act(() => { vi.advanceTimersByTime(5 * 60_000); });
    expect(screen.getByRole("button", { name: /night mode/ })).toBeInTheDocument();
  });
});
