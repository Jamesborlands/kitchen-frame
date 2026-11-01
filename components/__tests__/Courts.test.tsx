import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Courts } from "@/components/Courts";

describe("Courts", () => {
  it('renders "tennis & pickleball" section label', () => {
    render(<Courts />);
    expect(screen.getByText("tennis & pickleball")).toBeInTheDocument();
  });

  it("renders a known court entry", () => {
    render(<Courts />);
    expect(
      screen.getByText("Ludlow tennis club")
    ).toBeInTheDocument();
  });
});
