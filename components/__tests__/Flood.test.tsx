import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

const mockUseFlood = vi.fn();

vi.mock("@/lib/hooks/useFlood", () => ({
  useFlood: () => mockUseFlood(),
}));

import { Flood } from "@/components/Flood";

const WARNING_DATA = {
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
    },
  ],
};

describe("Flood with warnings", () => {
  it("renders the section label", () => {
    mockUseFlood.mockReturnValue({ data: WARNING_DATA, error: undefined, isLoading: false });
    render(<Flood />);
    expect(screen.getByText(/flood watch/i)).toBeInTheDocument();
  });

  it("shows the flood warning severity", () => {
    mockUseFlood.mockReturnValue({ data: WARNING_DATA, error: undefined, isLoading: false });
    render(<Flood />);
    expect(screen.getByText(/flood alert/i)).toBeInTheDocument();
  });

  it("shows the flood warning area", () => {
    mockUseFlood.mockReturnValue({ data: WARNING_DATA, error: undefined, isLoading: false });
    render(<Flood />);
    expect(screen.getAllByText(/river teme/i).length).toBeGreaterThan(0);
  });

  it("shows river level", () => {
    mockUseFlood.mockReturnValue({ data: WARNING_DATA, error: undefined, isLoading: false });
    render(<Flood />);
    expect(screen.getByText(/0\.42/)).toBeInTheDocument();
  });
});

describe("Flood with no warnings", () => {
  it("shows 'no flood warnings' message", () => {
    mockUseFlood.mockReturnValue({ data: { warnings: [], rivers: [] }, error: undefined, isLoading: false });
    render(<Flood />);
    expect(screen.getByText(/no flood warnings/i)).toBeInTheDocument();
  });
});

describe("Flood loading state", () => {
  it("shows loading text when data is undefined", () => {
    mockUseFlood.mockReturnValue({ data: undefined, error: undefined, isLoading: true });
    render(<Flood />);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it("shows error text on failure", () => {
    mockUseFlood.mockReturnValue({ data: undefined, error: new Error("fail"), isLoading: false });
    render(<Flood />);
    expect(screen.getByText(/couldn't load/i)).toBeInTheDocument();
  });
});
