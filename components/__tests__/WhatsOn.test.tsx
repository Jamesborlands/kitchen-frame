import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

const mockUseEvents = vi.fn();

vi.mock("@/lib/hooks/useEvents", () => ({
  useEvents: () => mockUseEvents(),
}));

import { WhatsOn } from "@/components/WhatsOn";

const SAMPLE_ITEMS = [
  {
    title: "Ludlow Castle summer concert series",
    link: "https://www.ludlowadvertiser.co.uk/event1",
    published: "Mon, 22 Jun 2026 12:00:00 GMT",
    description: "Free outdoor concerts in the castle grounds.",
    image: undefined,
  },
  {
    title: "Sue Perkins announces the Assembly Rooms show",
    link: "https://www.ludlowadvertiser.co.uk/event2",
    published: "Sun, 21 Jun 2026 10:00:00 GMT",
    description: undefined,
    image: undefined,
  },
];

describe("WhatsOn with items", () => {
  it("renders the section label", () => {
    mockUseEvents.mockReturnValue({ items: SAMPLE_ITEMS, error: undefined, isLoading: false });
    render(<WhatsOn />);
    expect(screen.getByText(/what's on/i)).toBeInTheDocument();
  });

  it("shows each event title and any description", () => {
    mockUseEvents.mockReturnValue({ items: SAMPLE_ITEMS, error: undefined, isLoading: false });
    render(<WhatsOn />);
    expect(screen.getByText(/castle summer concert/i)).toBeInTheDocument();
    expect(screen.getByText(/sue perkins/i)).toBeInTheDocument();
    expect(screen.getByText(/free outdoor concerts/i)).toBeInTheDocument();
  });

  it("shows formatted dates and links to the source", () => {
    mockUseEvents.mockReturnValue({ items: SAMPLE_ITEMS, error: undefined, isLoading: false });
    render(<WhatsOn />);
    expect(screen.getByText(/22 Jun/i)).toBeInTheDocument();
    expect(screen.getAllByRole("link")[0]).toHaveAttribute(
      "href",
      "https://www.ludlowadvertiser.co.uk/event1",
    );
  });
});

describe("WhatsOn local venues", () => {
  it("always shows the curated theatre/venue links, even with events present", () => {
    mockUseEvents.mockReturnValue({ items: SAMPLE_ITEMS, error: undefined, isLoading: false });
    render(<WhatsOn />);
    expect(screen.getByText(/at the local venues/i)).toBeInTheDocument();
    expect(screen.getByText(/ludlow assembly rooms/i)).toBeInTheDocument();
  });

  it("still shows the venue links when events fail to load", () => {
    mockUseEvents.mockReturnValue({ items: undefined, error: new Error("fail"), isLoading: false });
    render(<WhatsOn />);
    expect(screen.getByText(/ludlow assembly rooms/i)).toBeInTheDocument();
  });
});

describe("WhatsOn fail-soft states", () => {
  it("shows a calm message when nothing is listed", () => {
    mockUseEvents.mockReturnValue({ items: [], error: undefined, isLoading: false });
    render(<WhatsOn />);
    expect(screen.getByText(/nothing local listed/i)).toBeInTheDocument();
  });

  it("shows loading text when items is undefined", () => {
    mockUseEvents.mockReturnValue({ items: undefined, error: undefined, isLoading: true });
    render(<WhatsOn />);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it("shows an error message on failure", () => {
    mockUseEvents.mockReturnValue({ items: undefined, error: new Error("fail"), isLoading: false });
    render(<WhatsOn />);
    expect(screen.getByText(/couldn't load/i)).toBeInTheDocument();
  });
});
