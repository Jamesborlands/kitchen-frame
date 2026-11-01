import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/hooks/useWeather", () => ({
  useWeather: () => ({
    data: { current: { temperature: 15, weatherCode: 0 }, daily: [] },
    error: undefined, isLoading: false,
  }),
}));

import { FamilyClocks } from "@/components/FamilyClocks";

describe("FamilyClocks", () => {
  it("renders all four locations", () => {
    render(<FamilyClocks />);
    expect(screen.getByText("Ludlow")).toBeInTheDocument();
    expect(screen.getByText("Edinburgh")).toBeInTheDocument();
    expect(screen.getByText("Santa Cruz")).toBeInTheDocument();
    expect(screen.getByText("Queenstown")).toBeInTheDocument();
  });
});
