import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

const mockUseTrains = vi.fn();

vi.mock("@/lib/hooks/useTrains", () => ({
  useTrains: () => mockUseTrains(),
}));

import { Trains } from "@/components/Trains";

const BOARD_DATA = {
  services: [
    { std: "08:00", etd: "On time", platform: "1", operator: "Transport for Wales" },
    { std: "08:30", etd: "Cancelled", platform: "—", operator: "Transport for Wales" },
  ],
  messages: [
    "Strike action by RMT members may affect services on 24 June. Please check before you travel.",
  ],
};

describe("Trains component", () => {
  it("renders the section label", () => {
    mockUseTrains.mockReturnValue({ data: BOARD_DATA, error: undefined, isLoading: false });
    render(<Trains />);
    expect(screen.getByText(/trains to london/i)).toBeInTheDocument();
  });

  it("renders the route subtitle", () => {
    mockUseTrains.mockReturnValue({ data: BOARD_DATA, error: undefined, isLoading: false });
    render(<Trains />);
    expect(screen.getByText(/ludlow.*shrewsbury/i)).toBeInTheDocument();
  });

  it("renders a departure time", () => {
    mockUseTrains.mockReturnValue({ data: BOARD_DATA, error: undefined, isLoading: false });
    render(<Trains />);
    expect(screen.getByText("08:00")).toBeInTheDocument();
  });

  it("renders the cancelled status for the delayed service", () => {
    mockUseTrains.mockReturnValue({ data: BOARD_DATA, error: undefined, isLoading: false });
    render(<Trains />);
    expect(screen.getByText(/cancelled/i)).toBeInTheDocument();
  });

  it("shows the strike banner for a strike message", () => {
    mockUseTrains.mockReturnValue({ data: BOARD_DATA, error: undefined, isLoading: false });
    render(<Trains />);
    const strikeEls = screen.getAllByText(/strike action/i);
    expect(strikeEls.length).toBeGreaterThan(0);
  });

  it("shows loading when data is undefined and no error", () => {
    mockUseTrains.mockReturnValue({ data: undefined, error: undefined, isLoading: true });
    render(<Trains />);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it("shows error message when fetch fails", () => {
    mockUseTrains.mockReturnValue({ data: undefined, error: new Error("fail"), isLoading: false });
    render(<Trains />);
    expect(screen.getByText(/couldn't load trains/i)).toBeInTheDocument();
  });

  it("shows 'no departures found' when services is empty", () => {
    mockUseTrains.mockReturnValue({
      data: { services: [], messages: [] },
      error: undefined,
      isLoading: false,
    });
    render(<Trains />);
    expect(screen.getByText(/no departures found/i)).toBeInTheDocument();
  });

  it("shows platform when it is not '—'", () => {
    mockUseTrains.mockReturnValue({ data: BOARD_DATA, error: undefined, isLoading: false });
    render(<Trains />);
    expect(screen.getByText(/plat 1/i)).toBeInTheDocument();
  });

  it("does not render a disruption banner when messages is empty", () => {
    mockUseTrains.mockReturnValue({
      data: { services: BOARD_DATA.services, messages: [] },
      error: undefined,
      isLoading: false,
    });
    render(<Trains />);
    expect(screen.queryByText(/strike action/i)).not.toBeInTheDocument();
  });
});
