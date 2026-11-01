import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

// Mock the schedule config so the test is independent of the real (null) value.
vi.mock("@/lib/content/bins", () => ({
  BIN_SCHEDULE: {
    weekday: 2,
    anchor: "2026-06-23",
    types: [
      { name: "general waste", week: "A" },
      { name: "recycling", week: "B" },
      { name: "garden", week: "every" },
    ],
  },
}));

import { BinDay } from "@/components/BinDay";

describe("BinDay", () => {
  it("shows the next collection day and bins", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-25T08:00:00Z")); // Thu → next is Tue 30 Jun (week B)
    render(<BinDay />);
    expect(screen.getByText(/bin day/i)).toBeInTheDocument();
    expect(screen.getByText(/Tue 30 Jun/i)).toBeInTheDocument();
    expect(screen.getByText(/recycling \+ garden/i)).toBeInTheDocument();
    vi.useRealTimers();
  });
});

describe("BinDay with no schedule", () => {
  it("renders nothing when the schedule is null", async () => {
    vi.resetModules();
    vi.doMock("@/lib/content/bins", () => ({ BIN_SCHEDULE: null }));
    const { BinDay: BinDayNull } = await import("@/components/BinDay");
    const { container } = render(<BinDayNull />);
    expect(container).toBeEmptyDOMElement();
    vi.doUnmock("@/lib/content/bins");
  });
});
