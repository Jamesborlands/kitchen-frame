import { describe, it, expect, vi } from "vitest";
import { searchPlaces, placeFromResult } from "@/lib/geo/geocode";
import { sanitizePlace } from "@/lib/family/settings";

const BRISTOL = { name: "Bristol", latitude: 51.45523, longitude: -2.59671, timezone: "Europe/London", country: "United Kingdom", admin1: "England" };

describe("searchPlaces", () => {
  it("asks Open-Meteo and returns name, where, lat/lon and time zone", async () => {
    const fetchImpl = vi.fn(async () => Response.json({ results: [BRISTOL, { ...BRISTOL, name: "Bristol", country: "United States", admin1: "Connecticut", timezone: "America/New_York", latitude: 41.67, longitude: -72.94 }] }));
    const r = await searchPlaces("Bristol", fetchImpl as unknown as typeof fetch);
    expect(String((fetchImpl.mock.calls[0] as unknown[])[0])).toContain("geocoding-api.open-meteo.com/v1/search?name=Bristol");
    expect(r[0]).toEqual({ name: "Bristol", where: "England, United Kingdom", latitude: 51.4552, longitude: -2.5967, timezone: "Europe/London" });
    expect(r[1].where).toBe("Connecticut, United States");
  });

  it("nothing found, a blank search, or the service down → an empty list", async () => {
    expect(await searchPlaces("zzzz", (async () => Response.json({})) as unknown as typeof fetch)).toEqual([]);
    expect(await searchPlaces("  ", (async () => { throw new Error("no"); }) as unknown as typeof fetch)).toEqual([]);
    expect(await searchPlaces("x", (async () => new Response("down", { status: 503 })) as unknown as typeof fetch)).toEqual([]);
  });
});

describe("placeFromResult", () => {
  it("makes a valid place with who's there and no painting (the weather's sky instead)", () => {
    const p = placeFromResult({ name: "Bristol", where: "England, United Kingdom", latitude: 51.4552, longitude: -2.5967, timezone: "Europe/London" }, "Sophie");
    expect(sanitizePlace(p)).toEqual(p);
    expect(p).toMatchObject({ label: "Bristol", sublabel: "Sophie", watercolor: "", extra: null });
    expect(p.key).toMatch(/^bristol-[a-z0-9]+$/);
  });
});

describe("moving someone", () => {
  it("keeps who it is and the clock's place in the list; takes the new town's name, map spot, time zone and painting", async () => {
    const { movePlace } = await import("@/lib/geo/geocode");
    const kate = { key: "edinburgh", label: "Edinburgh", sublabel: "Kate", latitude: 55.95, longitude: -3.19, timezone: "Europe/London", watercolor: "place-edinburgh", extra: null };
    const moved = movePlace(kate as never, { name: "North Berwick", where: "Scotland, United Kingdom", latitude: 56.0583, longitude: -2.7172, timezone: "Europe/London" });
    expect(moved).toEqual({ ...kate, label: "North Berwick", latitude: 56.0583, longitude: -2.7172, watercolor: "place-northberwick" });
  });

  it("a move drops the old place's sea or snow panel", async () => {
    const { movePlace } = await import("@/lib/geo/geocode");
    const sam = { key: "santaCruz", label: "Santa Cruz", sublabel: "Sam", latitude: 36.97, longitude: -122.03, timezone: "America/Los_Angeles", watercolor: "place-santacruz", extra: "marine", tideStation: "9413745", buoy: "46236" };
    const moved = movePlace(sam as never, { name: "Bristol", where: "England", latitude: 51.45, longitude: -2.59, timezone: "Europe/London" });
    expect(moved.extra).toBeNull();
    expect("tideStation" in moved).toBe(false);
    expect(moved.watercolor).toBe("");
  });
});
