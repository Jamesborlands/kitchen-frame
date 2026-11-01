import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { BrambleWalkView } from "@/components/BrambleWalk";

describe("BrambleWalkView", () => {
  it("renders the recommended window and summary", () => {
    render(
      <BrambleWalkView
        window={{ start: "2026-06-25T16:00", end: "2026-06-25T18:00", tone: "good", summary: "dry & 19°" }}
      />,
    );
    expect(screen.getByText(/bramble's walk/i)).toBeInTheDocument();
    expect(screen.getByText(/4pm–6pm/)).toBeInTheDocument();
    expect(screen.getByText(/dry & 19°/)).toBeInTheDocument();
    expect(screen.getByText(/a lovely window/i)).toBeInTheDocument();
  });

  it("renders nothing when there's no window", () => {
    const { container } = render(<BrambleWalkView window={null} />);
    expect(container).toBeEmptyDOMElement();
  });
});
