import { render } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { ElevationProfile } from "@/components/ElevationProfile";

describe("ElevationProfile", () => {
  it("renders an SVG with area and line paths when given >= 2 elevations", () => {
    const { container } = render(
      <ElevationProfile elevations={[80, 100, 90, 120, 85]} />
    );
    const svg = container.querySelector("svg");
    expect(svg).not.toBeNull();
    const paths = container.querySelectorAll("path");
    expect(paths.length).toBeGreaterThanOrEqual(2);
  });

  it("renders nothing for empty array", () => {
    const { container } = render(<ElevationProfile elevations={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders nothing for a single elevation", () => {
    const { container } = render(<ElevationProfile elevations={[100]} />);
    expect(container.firstChild).toBeNull();
  });
});
