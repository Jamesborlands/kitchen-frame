import { render } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Sparkline } from "@/components/Sparkline";

describe("Sparkline", () => {
  it("renders a polyline with the correct number of points when given multiple values", () => {
    const values = [0.24, 0.25, 0.27, 0.26, 0.28];
    const { container } = render(<Sparkline values={values} />);
    const polyline = container.querySelector("polyline");
    expect(polyline).not.toBeNull();
    // Each value becomes one point — so points attr has N space-separated pairs
    const points = polyline!.getAttribute("points")!.trim().split(/\s+/);
    expect(points).toHaveLength(values.length);
  });

  it("renders nothing when values is empty", () => {
    const { container } = render(<Sparkline values={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders nothing when values has only one entry", () => {
    const { container } = render(<Sparkline values={[0.24]} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders an SVG element", () => {
    const { container } = render(<Sparkline values={[0.24, 0.25, 0.27]} />);
    const svg = container.querySelector("svg");
    expect(svg).not.toBeNull();
  });

  it("is aria-hidden", () => {
    const { container } = render(<Sparkline values={[0.24, 0.25, 0.27]} />);
    const svg = container.querySelector("svg");
    expect(svg?.getAttribute("aria-hidden")).toBe("true");
  });

  it("applies the provided className to the svg", () => {
    const { container } = render(<Sparkline values={[0.24, 0.25, 0.27]} className="text-sage" />);
    const svg = container.querySelector("svg");
    expect(svg?.getAttribute("class")).toContain("text-sage");
  });

  it("handles all-equal values without error (flat mid-line)", () => {
    const values = [0.5, 0.5, 0.5];
    const { container } = render(<Sparkline values={values} />);
    const polyline = container.querySelector("polyline");
    expect(polyline).not.toBeNull();
    const points = polyline!.getAttribute("points")!.trim().split(/\s+/);
    expect(points).toHaveLength(3);
  });

  it("produces exactly N points for N values (2 values)", () => {
    const values = [0.3, 0.4];
    const { container } = render(<Sparkline values={values} />);
    const polyline = container.querySelector("polyline");
    const points = polyline!.getAttribute("points")!.trim().split(/\s+/);
    expect(points).toHaveLength(2);
  });
});
