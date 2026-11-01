import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/hooks/useSnow", () => ({
  useSnow: () => ({
    data: { snowDepthCm: 142, recentSnowfallCm: 8 },
    isLoading: false,
  }),
}));

vi.mock("@/components/WatercolorScene", () => ({
  WatercolorScene: () => <div data-testid="watercolor-scene" />,
}));

import { Skiing } from "@/components/Skiing";

describe("Skiing", () => {
  describe("southern hemisphere winter (June 2026)", () => {
    const now = new Date("2026-06-23");

    it("shows Queenstown as in season", () => {
      render(<Skiing now={now} />);
      expect(screen.getByText("Queenstown")).toBeInTheDocument();
    });

    it("does not show Snowtrax (dry slopes removed)", () => {
      render(<Skiing now={now} />);
      expect(screen.queryByText("Snowtrax")).toBeNull();
    });

    it("shows in season label", () => {
      render(<Skiing now={now} />);
      expect(screen.getByText("in season")).toBeInTheDocument();
    });
  });

  describe("southern hemisphere winter (August 2026)", () => {
    const now = new Date("2026-08-15");

    it("shows Queenstown as in season", () => {
      render(<Skiing now={now} />);
      expect(screen.getByText("Queenstown")).toBeInTheDocument();
    });
  });

  describe("off-season (May 2026)", () => {
    const now = new Date("2026-05-15");

    it("renders nothing when nothing is in season", () => {
      const { container } = render(<Skiing now={now} />);
      expect(container).toBeEmptyDOMElement();
    });

    it("does not show skiing section label", () => {
      render(<Skiing now={now} />);
      expect(screen.queryByText("skiing")).toBeNull();
    });
  });
});
