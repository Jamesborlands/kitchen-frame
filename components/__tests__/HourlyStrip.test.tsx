import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

const mockUseWeather = vi.fn();
vi.mock("@/lib/hooks/useWeather", () => ({ useWeather: () => mockUseWeather() }));

import { HourlyStrip } from "@/components/HourlyStrip";

describe("HourlyStrip", () => {
  it("renders upcoming hours with temps and rain chance", () => {
    // far-future times so they always pass the "upcoming" filter
    mockUseWeather.mockReturnValue({
      data: {
        current: {},
        daily: [],
        hourly: [
          { time: "2099-06-25T15:00", temp: 21.4, precipProbability: 40, weatherCode: 61 },
          { time: "2099-06-25T16:00", temp: 20.1, precipProbability: 5, weatherCode: 3 },
        ],
      },
    });
    render(<HourlyStrip />);
    expect(screen.getByText("3pm")).toBeInTheDocument();
    expect(screen.getByText("21°")).toBeInTheDocument();
    expect(screen.getByText("40%")).toBeInTheDocument(); // shown (>=20)
    expect(screen.queryByText("5%")).not.toBeInTheDocument(); // hidden (<20)
  });

  it("renders nothing when there is no hourly data", () => {
    mockUseWeather.mockReturnValue({ data: { current: {}, daily: [], hourly: [] } });
    const { container } = render(<HourlyStrip />);
    expect(container).toBeEmptyDOMElement();
  });
});
