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

vi.mock("@/lib/hooks/useNow", () => ({
  useNow: vi.fn(() => new Date("2026-06-23T14:00:00")),
}));

import { SantaCruzMarine } from "@/components/SantaCruzMarine";

describe("SantaCruzMarine", () => {
  it("renders the section label", () => {
    render(<SantaCruzMarine />);
    expect(screen.getByText("sea & surf")).toBeInTheDocument();
  });

  it("renders next high tide with formatted time and height", () => {
    render(<SantaCruzMarine />);
    expect(screen.getByText(/next high/)).toBeInTheDocument();
    expect(screen.getByText(/10:45pm/)).toBeInTheDocument();
    expect(screen.getByText(/5\.6ft/)).toBeInTheDocument();
  });

  it("renders next low tide with formatted time and height", () => {
    render(<SantaCruzMarine />);
    expect(screen.getByText(/next low/)).toBeInTheDocument();
    expect(screen.getByText(/4:30pm/)).toBeInTheDocument();
    expect(screen.getByText(/0\.8ft/)).toBeInTheDocument();
  });

  it("renders wave height and period", () => {
    render(<SantaCruzMarine />);
    expect(screen.getByText(/3\.2ft/)).toBeInTheDocument();
    expect(screen.getByText(/15s/)).toBeInTheDocument();
  });

  it("renders water temperature", () => {
    render(<SantaCruzMarine />);
    expect(screen.getByText(/66°F/)).toBeInTheDocument();
  });

  it("renders compass direction for 270 degrees (W)", () => {
    render(<SantaCruzMarine />);
    expect(screen.getByText(/\bW\b/)).toBeInTheDocument();
  });
});
