import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { OutAndAbout } from "@/components/OutAndAbout";

describe("OutAndAbout", () => {
  it("renders the out & about section label", () => {
    render(<OutAndAbout />);
    expect(screen.getByText("out & about")).toBeInTheDocument();
  });

  it("renders three category headings", () => {
    render(<OutAndAbout />);
    expect(screen.getByText("walks")).toBeInTheDocument();
    expect(screen.getByText("cycling")).toBeInTheDocument();
    expect(screen.getByText("local life")).toBeInTheDocument();
  });
});
