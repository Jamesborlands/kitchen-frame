import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { PREMADE_ROUTES } from "@/lib/map/routes";
import type { PremadeRoute } from "@/lib/map/routes";

// Mock fetch to avoid real BRouter calls
beforeEach(() => {
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      features: [{ properties: { "track-length": 4200, "filtered ascend": 74 } }],
    }),
  });
});

import { SuggestedRoutes } from "@/components/SuggestedRoutes";

describe("SuggestedRoutes", () => {
  it("renders the section label 'suggested routes'", () => {
    render(<SuggestedRoutes />);
    expect(screen.getByText(/suggested routes/i)).toBeInTheDocument();
  });

  it("renders route names including Ludlow town circular and Corve Dale lanes", () => {
    render(<SuggestedRoutes />);
    expect(screen.getByText("Ludlow town circular")).toBeInTheDocument();
    expect(screen.getByText("Corve Dale lanes")).toBeInTheDocument();
  });

  it("renders filter pills for all, chill ride, gravel, and walk", () => {
    render(<SuggestedRoutes />);
    const buttons = screen.getAllByRole("button");
    const buttonLabels = buttons.map((b) => b.textContent);
    expect(buttonLabels).toContain("all");
    expect(buttonLabels).toContain("chill ride");
    expect(buttonLabels).toContain("gravel");
    expect(buttonLabels).toContain("walk");
  });

  it("renders all route cards on initial render", () => {
    render(<SuggestedRoutes />);
    const routeCount = PREMADE_ROUTES.length;
    PREMADE_ROUTES.forEach((route) => {
      expect(screen.getByText(route.name)).toBeInTheDocument();
    });
    // Verify the count matches PREMADE_ROUTES
    expect(routeCount).toBe(10);
  });

  it("calls onSelect when a route card is clicked", () => {
    const onSelect = vi.fn();
    render(<SuggestedRoutes onSelect={onSelect} />);
    const card = screen.getByRole("button", { name: /Ludlow town circular/i });
    fireEvent.click(card);
    expect(onSelect).toHaveBeenCalledTimes(1);
    const calledWith = onSelect.mock.calls[0][0] as PremadeRoute;
    expect(calledWith.name).toBe("Ludlow town circular");
  });

  it("applies selected styling to the active route card", () => {
    const selected = PREMADE_ROUTES[0];
    render(<SuggestedRoutes selected={selected} />);
    const card = screen.getByRole("button", { name: /Ludlow town circular/i });
    expect(card.className).toContain("border-sage");
  });

  it('shows "from the house" for local routes and "drive to start" for drive routes', () => {
    render(<SuggestedRoutes />);
    // A local route (no drive flag) — should show "from the house"
    expect(screen.getAllByText("from the house").length).toBeGreaterThan(0);
    // A drive route — should show "drive to start"
    expect(screen.getAllByText("drive to start").length).toBeGreaterThan(0);
  });
});
