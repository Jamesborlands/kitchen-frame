import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

const mockUseCalendar = vi.fn();
vi.mock("@/lib/hooks/useCalendar", () => ({ useCalendar: () => mockUseCalendar() }));

import { Calendar } from "@/components/Calendar";

describe("Calendar", () => {
  it("lists upcoming events with day, title, location and time", () => {
    mockUseCalendar.mockReturnValue({
      events: [
        { title: "Bin collection - recycling", start: "2026-06-26T00:00:00.000Z", allDay: true },
        { title: "Anne's pickleball", start: "2026-06-30T10:00:00.000Z", allDay: false, location: "Ludlow Leisure Centre" },
      ],
    });
    render(<Calendar />);
    expect(screen.getByText(/coming up/i)).toBeInTheDocument();
    expect(screen.getByText(/bin collection/i)).toBeInTheDocument();
    expect(screen.getByText(/anne's pickleball/i)).toBeInTheDocument();
    expect(screen.getByText(/leisure centre/i)).toBeInTheDocument();
  });

  it("renders nothing when there are no events (hidden until configured)", () => {
    mockUseCalendar.mockReturnValue({ events: [] });
    const { container } = render(<Calendar />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing while loading", () => {
    mockUseCalendar.mockReturnValue({ events: undefined });
    const { container } = render(<Calendar />);
    expect(container).toBeEmptyDOMElement();
  });
});
