import { render } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { MoonIcon } from "@/components/MoonIcon";

describe("MoonIcon", () => {
  it("renders an svg with aria-hidden for every phase", () => {
    const phases = [
      "new moon",
      "waxing crescent",
      "first quarter",
      "waxing gibbous",
      "full moon",
      "waning gibbous",
      "last quarter",
      "waning crescent",
    ];
    for (const phase of phases) {
      const { container } = render(<MoonIcon phase={phase} />);
      const svg = container.querySelector("svg");
      expect(svg, `svg missing for phase "${phase}"`).not.toBeNull();
      expect(
        svg?.getAttribute("aria-hidden"),
        `aria-hidden missing for "${phase}"`
      ).toBe("true");
    }
  });

  it("renders distinct SVG markup for 'new moon' vs 'full moon'", () => {
    const { container: c1 } = render(<MoonIcon phase="new moon" />);
    const { container: c2 } = render(<MoonIcon phase="full moon" />);
    expect(c1.innerHTML).not.toBe(c2.innerHTML);
  });

  it("renders distinct SVG markup for 'full moon' vs 'first quarter'", () => {
    const { container: c1 } = render(<MoonIcon phase="full moon" />);
    const { container: c2 } = render(<MoonIcon phase="first quarter" />);
    expect(c1.innerHTML).not.toBe(c2.innerHTML);
  });

  it("renders distinct SVG markup for 'first quarter' vs 'last quarter'", () => {
    const { container: c1 } = render(<MoonIcon phase="first quarter" />);
    const { container: c2 } = render(<MoonIcon phase="last quarter" />);
    expect(c1.innerHTML).not.toBe(c2.innerHTML);
  });

  it("renders distinct SVG markup for 'waxing crescent' vs 'waning crescent'", () => {
    const { container: c1 } = render(<MoonIcon phase="waxing crescent" />);
    const { container: c2 } = render(<MoonIcon phase="waning crescent" />);
    expect(c1.innerHTML).not.toBe(c2.innerHTML);
  });

  it("renders distinct SVG markup for 'waxing gibbous' vs 'waning gibbous'", () => {
    const { container: c1 } = render(<MoonIcon phase="waxing gibbous" />);
    const { container: c2 } = render(<MoonIcon phase="waning gibbous" />);
    expect(c1.innerHTML).not.toBe(c2.innerHTML);
  });

  it("falls back gracefully to an outline circle for an unknown phase", () => {
    const { container } = render(<MoonIcon phase="mystery phase" />);
    const svg = container.querySelector("svg");
    expect(svg).not.toBeNull();
    // Should render the fallback outline circle, not crash
    const circle = container.querySelector("circle");
    expect(circle).not.toBeNull();
  });

  it("accepts a className prop and applies it to the svg", () => {
    const { container } = render(
      <MoonIcon phase="full moon" className="text-sage" />
    );
    const svg = container.querySelector("svg");
    expect(svg?.classList.contains("text-sage")).toBe(true);
  });
});
