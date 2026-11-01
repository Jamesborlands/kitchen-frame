import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/content/occasions", () => ({
  OCCASIONS: [
    { name: "Kate", month: 7, day: 6, kind: "birthday", year: 1998 },
    { name: "Anne & Peter's anniversary", month: 6, day: 25, kind: "anniversary", year: 1990 },
  ],
}));

import { Occasions } from "@/components/Occasions";

describe("Occasions", () => {
  it("counts down to upcoming family dates with ages/years", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-25T08:00:00Z"));
    render(<Occasions />);
    expect(screen.getByText(/celebrations/i)).toBeInTheDocument();
    expect(screen.getByText("today")).toBeInTheDocument();
    expect(screen.getByText(/Anne & Peter's anniversary/)).toBeInTheDocument();
    expect(screen.getByText(/36 years/)).toBeInTheDocument();
    expect(screen.getByText("in 11 days")).toBeInTheDocument();
    expect(screen.getByText(/turns 28/)).toBeInTheDocument();
    vi.useRealTimers();
  });
});

describe("Occasions with none configured", () => {
  it("renders nothing", async () => {
    vi.resetModules();
    vi.doMock("@/lib/content/occasions", () => ({ OCCASIONS: [] }));
    const { Occasions: Empty } = await import("@/components/Occasions");
    const { container } = render(<Empty />);
    expect(container).toBeEmptyDOMElement();
    vi.doUnmock("@/lib/content/occasions");
  });
});
