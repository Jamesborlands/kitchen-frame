import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

const mockUseWarnings = vi.fn();
vi.mock("@/lib/hooks/useWarnings", () => ({
  useWarnings: () => mockUseWarnings(),
}));

import { WarningBanner } from "@/components/WarningBanner";

describe("WarningBanner", () => {
  it("shows the most severe warning with level, type and end day", () => {
    mockUseWarnings.mockReturnValue({
      warnings: [
        { level: "red", type: "extreme heat", period: "from 0800 Wed 24 Jun to 2259 Thu 25 Jun", link: "https://met/red" },
        { level: "yellow", type: "thunderstorm", period: "", link: "" },
      ],
    });
    render(<WarningBanner />);
    expect(screen.getByText(/red weather warning/i)).toBeInTheDocument();
    expect(screen.getByText(/extreme heat until Thu 25 Jun/i)).toBeInTheDocument();
    expect(screen.getByRole("link")).toHaveAttribute("href", "https://met/red");
  });

  it("renders nothing when there are no warnings", () => {
    mockUseWarnings.mockReturnValue({ warnings: [] });
    const { container } = render(<WarningBanner />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing while warnings are still loading", () => {
    mockUseWarnings.mockReturnValue({ warnings: undefined });
    const { container } = render(<WarningBanner />);
    expect(container).toBeEmptyDOMElement();
  });
});
