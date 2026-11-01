import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

const mockUseCalendar = vi.fn();
vi.mock("@/lib/hooks/useCalendar", () => ({ useCalendar: () => mockUseCalendar() }));

import { CalendarFull } from "@/components/CalendarFull";

describe("CalendarFull", () => {
  it("groups events under day headings with times / all-day", () => {
    mockUseCalendar.mockReturnValue({
      events: [
        { title: "Bin collection", start: "2026-06-26T00:00:00.000Z", allDay: true },
        { title: "Anne's pickleball", start: "2026-06-30T09:00:00.000Z", allDay: false, location: "Ludlow Leisure Centre" },
        { title: "Dentist", start: "2026-06-30T14:00:00.000Z", allDay: false },
      ],
    });
    render(<CalendarFull />);
    // two day groups
    expect(screen.getByText(/friday 26 june/i)).toBeInTheDocument();
    expect(screen.getByText(/tuesday 30 june/i)).toBeInTheDocument();
    expect(screen.getByText("all day")).toBeInTheDocument();
    expect(screen.getByText(/anne's pickleball/i)).toBeInTheDocument();
    expect(screen.getByText(/leisure centre/i)).toBeInTheDocument();
  });

  it("shows a calm empty message when the diary is clear", () => {
    mockUseCalendar.mockReturnValue({ events: [] });
    render(<CalendarFull />);
    expect(screen.getByText(/nothing in the diary/i)).toBeInTheDocument();
  });
});
