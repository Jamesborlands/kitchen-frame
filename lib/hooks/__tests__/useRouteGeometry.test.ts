import { describe, it, expect } from "vitest";
import { parseRouteGeometry } from "@/lib/hooks/useRouteGeometry";

describe("parseRouteGeometry", () => {
  it("parses coords, lengthM and ascentM from a BRouter feature collection", () => {
    const fixture = {
      features: [
        {
          geometry: {
            coordinates: [
              [-2.7165, 52.369, 85],
              [-2.7262, 52.364, 102],
              [-2.7165, 52.369, 85],
            ],
          },
          properties: {
            "track-length": 4200,
            "filtered ascend": 74.6,
          },
        },
      ],
    };
    const result = parseRouteGeometry(fixture as Parameters<typeof parseRouteGeometry>[0]);
    expect(result).not.toBeNull();
    expect(result!.coords).toHaveLength(3);
    expect(result!.coords[0]).toEqual([-2.7165, 52.369, 85]);
    expect(result!.lengthM).toBe(4200);
    expect(result!.ascentM).toBe(75); // Math.round(74.6)
  });

  it("returns null when features array is empty", () => {
    const result = parseRouteGeometry({ features: [] } as Parameters<typeof parseRouteGeometry>[0]);
    expect(result).toBeNull();
  });
});
