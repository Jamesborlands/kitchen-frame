import { render } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { WeatherIcon } from "@/components/WeatherIcon";

describe("WeatherIcon", () => {
  it("renders svg with aria-hidden for clear sky", () => {
    const { container } = render(<WeatherIcon sky="clear" />);
    const svg = container.querySelector("svg");
    expect(svg).not.toBeNull();
    expect(svg?.getAttribute("aria-hidden")).toBe("true");
  });

  it("renders distinct markup for clear vs rain", () => {
    const { container: c1 } = render(<WeatherIcon sky="clear" />);
    const { container: c2 } = render(<WeatherIcon sky="rain" />);
    expect(c1.innerHTML).not.toBe(c2.innerHTML);
  });

  it("exposes an accessible label and <title> when title is given", () => {
    const { container } = render(<WeatherIcon sky="rain" title="light rain" />);
    const svg = container.querySelector("svg");
    expect(svg?.getAttribute("aria-hidden")).toBeNull();
    expect(svg?.getAttribute("role")).toBe("img");
    expect(svg?.getAttribute("aria-label")).toBe("light rain");
    expect(container.querySelector("title")?.textContent).toBe("light rain");
  });
});
