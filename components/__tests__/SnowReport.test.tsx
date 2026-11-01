import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

interface SnowResult {
  data?: { snowDepthCm: number | null; recentSnowfallCm: number };
  error: undefined;
  isLoading: boolean;
}

const mockUseSnow = vi.fn((): SnowResult => ({
  data: {
    snowDepthCm: 142,
    recentSnowfallCm: 8,
  },
  error: undefined,
  isLoading: false,
}));

vi.mock("@/lib/hooks/useSnow", () => ({
  useSnow: () => mockUseSnow(),
}));

import { SnowReport } from "@/components/SnowReport";
import { SKI_LOCATIONS } from "@/lib/config";

const queenstown = SKI_LOCATIONS.find((l) => l.key === "queenstown");
if (!queenstown) throw new Error("queenstown missing from SKI_LOCATIONS");

describe("SnowReport", () => {
  it("renders the section label", () => {
    render(<SnowReport location={queenstown} />);
    expect(screen.getByText("snow report")).toBeInTheDocument();
  });

  it("renders snow depth", () => {
    render(<SnowReport location={queenstown} />);
    expect(screen.getByText(/snow depth/)).toBeInTheDocument();
    expect(screen.getByText(/142/)).toBeInTheDocument();
  });

  it("renders recent snowfall", () => {
    render(<SnowReport location={queenstown} />);
    expect(screen.getByText(/last few days/)).toBeInTheDocument();
    expect(screen.getByText(/8/)).toBeInTheDocument();
  });

  it("renders lift status note", () => {
    render(<SnowReport location={queenstown} />);
    expect(screen.getByText(/lift status/)).toBeInTheDocument();
    expect(screen.getByText(/check the resort/)).toBeInTheDocument();
  });

  it("shows — for null snow depth", () => {
    mockUseSnow.mockReturnValueOnce({
      data: { snowDepthCm: null, recentSnowfallCm: 8 },
      error: undefined,
      isLoading: false,
    });
    render(<SnowReport location={queenstown} />);
    expect(screen.getByText(/snow depth — —/)).toBeInTheDocument();
  });

  it("shows fallback when data is undefined", () => {
    mockUseSnow.mockReturnValueOnce({
      data: undefined,
      error: undefined,
      isLoading: false,
    });
    render(<SnowReport location={queenstown} />);
    expect(screen.getByText("snow data unavailable")).toBeInTheDocument();
  });
});
