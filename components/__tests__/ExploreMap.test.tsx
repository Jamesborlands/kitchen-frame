import { render, screen } from "@testing-library/react";
import { ExploreMap } from "@/components/ExploreMap";

describe("ExploreMap", () => {
  it("renders the map container with role and aria-label", () => {
    render(<ExploreMap />);
    const container = screen.getByRole("img", {
      name: "map of paths and cycle routes around Ludlow",
    });
    expect(container).toBeInTheDocument();
  });
});
