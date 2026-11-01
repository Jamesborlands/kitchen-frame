import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { MoonPhase } from "@/components/MoonPhase";

const REF_MS = Date.UTC(2000, 0, 6, 18, 14); // new moon epoch
const SYNODIC = 29.530588853;
const DAY_MS = 86_400_000;

describe("MoonPhase", () => {
  it("shows 'new moon' text at the reference epoch", () => {
    render(<MoonPhase date={new Date(REF_MS)} />);
    expect(screen.getByText(/new moon/i)).toBeInTheDocument();
  });

  it("shows 'full moon' and '100% lit' at epoch + SYNODIC/2", () => {
    const fullMoon = new Date(REF_MS + (SYNODIC / 2) * DAY_MS);
    render(<MoonPhase date={fullMoon} />);
    expect(screen.getByText(/full moon/i)).toBeInTheDocument();
    expect(screen.getByText(/100/)).toBeInTheDocument();
  });
});
