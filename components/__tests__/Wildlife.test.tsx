import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

const mockUseWildlife = vi.fn();

vi.mock("@/lib/hooks/useWildlife", () => ({
  useWildlife: () => mockUseWildlife(),
}));

import { Wildlife } from "@/components/Wildlife";
import type { Sighting } from "@/lib/sources/wildlife";

const SIGHTING_A: Sighting = {
  id: 1001,
  name: "sycamore",
  scientific: "Acer pseudoplatanus",
  taxon: "Plantae",
  photo: "https://example.com/photo1/small.jpg",
  lat: 52.3675, lng: -2.7181, when: "2026-06-01",
};
const SIGHTING_B: Sighting = {
  id: 1002,
  name: "Eurasian Blackbird",
  scientific: "Turdus merula",
  taxon: "Aves",
  // no photo
  lat: 52.37, lng: -2.72, when: "2026-06-02",
};

describe("Wildlife loading state", () => {
  it("renders section label and loading text", () => {
    mockUseWildlife.mockReturnValue({ data: undefined, error: undefined, isLoading: true });
    render(<Wildlife />);
    expect(screen.getByText(/plants & wildlife nearby/i)).toBeInTheDocument();
    expect(screen.getByText(/loading sightings/i)).toBeInTheDocument();
  });
});

describe("Wildlife with sightings", () => {
  it("renders both sighting names when both have photos", () => {
    const sightingBWithPhoto: Sighting = { ...SIGHTING_B, photo: "https://example.com/photo2/small.jpg" };
    mockUseWildlife.mockReturnValue({ data: [SIGHTING_A, sightingBWithPhoto], error: undefined, isLoading: false });
    render(<Wildlife />);
    expect(screen.getByText("sycamore")).toBeInTheDocument();
    expect(screen.getByText("Eurasian Blackbird")).toBeInTheDocument();
  });

  it("filters out sightings without a photo", () => {
    mockUseWildlife.mockReturnValue({ data: [SIGHTING_A, SIGHTING_B], error: undefined, isLoading: false });
    render(<Wildlife />);
    expect(screen.getByText("sycamore")).toBeInTheDocument();
    expect(screen.queryByText("Eurasian Blackbird")).not.toBeInTheDocument();
  });
});
