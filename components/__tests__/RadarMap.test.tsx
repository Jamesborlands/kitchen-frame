import { render, screen } from "@testing-library/react";
import { RadarMap } from "@/components/RadarMap";

describe("RadarMap", () => {
  it("renders the radar map container with role and aria-label", () => {
    render(<RadarMap />);
    expect(screen.getByRole("img", { name: "rain radar map" })).toBeInTheDocument();
  });
});
