import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { RouteDetail } from "@/components/RouteDetail";
import type { PremadeRoute } from "@/lib/map/routes";

vi.mock("@/lib/hooks/useRouteGeometry", () => ({
  useRouteGeometry: () => ({
    data: {
      coords: [
        [-2.7165, 52.369, 85],
        [-2.7262, 52.364, 102],
        [-2.7165, 52.369, 85],
      ],
      lengthM: 8400,
      ascentM: 74,
    },
    isLoading: false,
    error: null,
  }),
}));

const mockRoute: PremadeRoute = {
  name: "Ludlow town circular",
  profile: "trekking",
  waypoints: [[52.369, -2.7165], [52.364, -2.7262], [52.369, -2.7165]],
};

describe("RouteDetail", () => {
  it("renders nothing when route is null", () => {
    const { container } = render(
      <RouteDetail route={null} onClear={() => undefined} />
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders the route name, km distance, and elevation SVG when route is set", () => {
    render(<RouteDetail route={mockRoute} onClear={() => undefined} />);
    expect(screen.getByText("Ludlow town circular")).toBeInTheDocument();
    expect(screen.getByText(/8\.4 km/)).toBeInTheDocument();
    const svg = document.querySelector("svg");
    expect(svg).not.toBeNull();
  });

  it("calls onClear when × close is clicked", async () => {
    const onClear = vi.fn();
    render(<RouteDetail route={mockRoute} onClear={onClear} />);
    screen.getByRole("button", { name: /close/i }).click();
    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it('shows "from the house" for a local route', () => {
    render(<RouteDetail route={mockRoute} onClear={() => undefined} />);
    expect(screen.getByText("from the house")).toBeInTheDocument();
  });

  it('shows "drive to start" for a drive route', () => {
    const driveRoute: PremadeRoute = {
      name: "Mortimer Forest (off-road)",
      profile: "mtb",
      waypoints: [[52.3615,-2.7480],[52.3545,-2.7800]],
      drive: true,
    };
    render(<RouteDetail route={driveRoute} onClear={() => undefined} />);
    expect(screen.getByText("drive to start")).toBeInTheDocument();
  });
});
