import { render } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { PaperGrain } from "@/components/PaperGrain";

describe("PaperGrain", () => {
  it("renders a non-interactive decorative overlay", () => {
    const { container } = render(<PaperGrain />);
    const el = container.firstChild as HTMLElement;
    expect(el).toHaveAttribute("aria-hidden", "true");
    expect(container.querySelector("feTurbulence")).not.toBeNull();
  });
});
