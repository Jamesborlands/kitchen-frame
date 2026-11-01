import { describe, it, expect } from "vitest";
import { HOME, FAMILY_LOCATIONS, REFRESH, SKI_LOCATIONS, ALL_LOCATIONS, WHISTLER, locationBySlug } from "@/lib/config";

describe("config", () => {
  it("home is Ludlow at the spec coords", () => {
    expect(HOME.latitude).toBe(52.3675);
    expect(HOME.longitude).toBe(-2.7181);
    expect(HOME.timezone).toBe("Europe/London");
  });
  it("has four family locations, Ludlow first, with unique keys", () => {
    expect(FAMILY_LOCATIONS).toHaveLength(4);
    expect(FAMILY_LOCATIONS[0].key).toBe("ludlow");
    expect(new Set(FAMILY_LOCATIONS.map((l) => l.key)).size).toBe(4);
  });
  it("Queenstown is in the Auckland tz", () => {
    const mb = FAMILY_LOCATIONS.find((l) => l.key === "queenstown");
    expect(mb?.timezone).toBe("Pacific/Auckland");
  });
  it("Santa Cruz entry has correct label and coords", () => {
    const sd = FAMILY_LOCATIONS.find((l) => l.key === "santaCruz");
    expect(sd?.label).toBe("Santa Cruz");
    expect(sd?.latitude).toBe(36.9741);
    expect(sd?.longitude).toBe(-122.0308);
  });
  it("HOME identity is preserved as FAMILY_LOCATIONS[0]", () => {
    expect(FAMILY_LOCATIONS[0]).toBe(HOME);
    expect(HOME.sublabel).toBe("Anne & Peter");
  });
  it("refresh cadence is 10 minutes", () => {
    expect(REFRESH.dataMs).toBe(600_000);
  });
});

describe("SKI_LOCATIONS", () => {
  it("has exactly 2 entries", () => {
    expect(SKI_LOCATIONS).toHaveLength(2);
  });

  it("includes Whistler with correct coords and timezone", () => {
    const breck = SKI_LOCATIONS.find((l) => l.key === "whistler");
    expect(breck).toBeDefined();
    expect(breck?.label).toBe("Whistler");
    expect(breck?.sublabel).toBe("the cabin");
    expect(breck?.latitude).toBe(50.1163);
    expect(breck?.longitude).toBe(-122.9574);
    expect(breck?.timezone).toBe("America/Vancouver");
    expect(breck?.watercolor).toBe("place-whistler");
  });

  it("WHISTLER named export is the same object reference as in SKI_LOCATIONS and ALL_LOCATIONS", () => {
    const skiBreck = SKI_LOCATIONS.find((l) => l.key === "whistler");
    const allBreck = ALL_LOCATIONS.find((l) => l.key === "whistler");
    expect(skiBreck).toBe(WHISTLER);
    expect(allBreck).toBe(WHISTLER);
  });

  it("Queenstown entry in SKI_LOCATIONS is the same object reference as in FAMILY_LOCATIONS", () => {
    const skiMb = SKI_LOCATIONS.find((l) => l.key === "queenstown");
    const famMb = FAMILY_LOCATIONS.find((l) => l.key === "queenstown");
    expect(skiMb).toBeDefined();
    expect(famMb).toBeDefined();
    expect(skiMb).toBe(famMb); // identity check
  });

  it("FAMILY_LOCATIONS still has exactly 4 entries and Whistler is not among them", () => {
    expect(FAMILY_LOCATIONS).toHaveLength(4);
    expect(FAMILY_LOCATIONS.find((l) => l.key === "whistler")).toBeUndefined();
  });
});

describe("slugs", () => {
  it("ALL_LOCATIONS has length 5 (4 family + Whistler, Queenstown not doubled)", () => {
    expect(ALL_LOCATIONS).toHaveLength(5);
  });

  it("every location in ALL_LOCATIONS has a unique slug", () => {
    const slugs = ALL_LOCATIONS.map((l) => l.slug);
    expect(new Set(slugs).size).toBe(ALL_LOCATIONS.length);
  });

  it("locationBySlug('santa-cruz') resolves to santaCruz key", () => {
    expect(locationBySlug("santa-cruz")?.key).toBe("santaCruz");
  });

  it("locationBySlug('whistler') is defined", () => {
    expect(locationBySlug("whistler")).toBeDefined();
  });

  it("locationBySlug('unknown-place') is undefined", () => {
    expect(locationBySlug("unknown-place")).toBeUndefined();
  });
});
