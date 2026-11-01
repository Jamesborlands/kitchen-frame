import { render, screen, fireEvent, within } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/hooks/useWeather", () => ({
  useWeather: () => ({
    data: {
      current: { temperature: 18, apparentTemperature: 17, weatherCode: 3, windSpeed: 10, humidity: 60, uvIndex: 4, precipitation: 0 },
      daily: [{ date: "2026-06-23", weatherCode: 3, tempMax: 21, tempMin: 12, sunrise: "2026-06-23T04:51", sunset: "2026-06-23T21:24", uvIndexMax: 5, precipitationSum: 0 }],
      hourly: [],
      fetchedAt: Date.now(),
    },
    error: undefined, isLoading: false,
  }),
}));
vi.mock("@/lib/hooks/useFrame", () => ({
  useFrame: () => ({
    data: {
      photos: [{ id: "1", url: "/a.webp", from: "Kate", at: Date.now(), lovable: false, loved: false }],
      notes: [{ id: "n1", text: "thinking of you all x", from: "Kate", at: Date.now() }],
    },
    love: vi.fn(),
  }),
}));
vi.mock("@/lib/hooks/useNotice", () => ({
  useNotice: () => ({ cards: [{ id: "c1", kind: "delight", label: "did you know", title: "a fact", priority: 1 }] }),
}));
vi.mock("@/lib/hooks/useWarnings", () => ({ useWarnings: () => ({ warnings: [] }) }));
vi.mock("@/components/ui/text-flipping-board", () => ({ TextFlippingBoard: () => <div>board</div> }));

import { KitchenDashboard } from "@/app/kitchen/KitchenDashboard";

describe("KitchenDashboard", () => {
  it("opens the forecast when the weather is tapped", () => {
    render(<KitchenDashboard />);
    fireEvent.click(screen.getByRole("button", { name: "open the weather forecast" }));
    expect(screen.getByRole("dialog", { name: "weather in ludlow" })).toBeInTheDocument();
  });

  it("opens a family member's place in a panel instead of leaving the page", () => {
    render(<KitchenDashboard />);
    fireEvent.click(screen.getByRole("button", { name: /Santa Cruz/ }));
    const panel = screen.getByRole("dialog", { name: "santa cruz" });
    expect(within(panel).getByRole("heading", { name: "Santa Cruz" })).toBeInTheDocument();
    fireEvent.click(within(panel).getByRole("button", { name: "close" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("opens the photo when it's tapped", () => {
    render(<KitchenDashboard />);
    const photo = screen.getByTestId("photo-frame-photo");
    fireEvent.pointerDown(photo, { clientX: 100 });
    fireEvent.pointerUp(photo, { clientX: 102 });
    expect(screen.getByRole("dialog", { name: "from the family" })).toBeInTheDocument();
  });

  it("opens every message when the board is tapped", () => {
    render(<KitchenDashboard />);
    fireEvent.click(screen.getByRole("button", { name: "show all messages" }));
    const panel = screen.getByRole("dialog", { name: "messages from the family" });
    expect(within(panel).getByText("thinking of you all x")).toBeInTheDocument();
  });
});
