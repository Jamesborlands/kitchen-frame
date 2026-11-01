import { render, screen } from "@testing-library/react";
import { FullMap } from "@/components/FullMap";

describe("FullMap", () => {
  it("renders the map container with role and aria-label", () => {
    render(<FullMap />);
    const container = screen.getByRole("img", {
      name: "interactive map of Ludlow walks and cycle routes",
    });
    expect(container).toBeInTheDocument();
  });

  it("renders all four route profile buttons", () => {
    render(<FullMap />);
    expect(screen.getByRole("button", { name: "chill ride" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "off-road / mtb" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "gravel" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "walk" })).toBeInTheDocument();
  });

  it("renders the clear control", () => {
    render(<FullMap />);
    expect(screen.getByRole("button", { name: "clear" })).toBeInTheDocument();
  });
});
