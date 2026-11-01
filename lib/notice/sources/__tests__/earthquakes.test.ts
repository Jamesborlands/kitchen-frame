import { describe, it, expect, vi } from "vitest";
import { buildQuakeUrl, parseQuakes, earthquakesSource } from "@/lib/notice/sources/earthquakes";
import { buildContext } from "@/lib/notice/card";
import { FAMILY_LOCATIONS, HOME } from "@/lib/config";

const santaCruz = FAMILY_LOCATIONS.find((l) => l.key === "santaCruz")!;

describe("buildQuakeUrl", () => {
  it("includes the location, radius, magnitude and a 48h starttime", () => {
    const url = buildQuakeUrl(santaCruz, new Date("2026-06-24T00:00:00Z"));
    expect(url).toContain("latitude=36.9741");
    expect(url).toContain("maxradiuskm=50");
    expect(url).toContain("minmagnitude=4.5");
    expect(url).toContain("starttime=2026-06-22");
  });
});

describe("parseQuakes", () => {
  it("maps the strongest features to quake cards with scaled priority", () => {
    const json = {
      features: [
        { properties: { mag: 4.2, place: "30km W of Santa Cruz", time: 1, url: "u" }, geometry: { coordinates: [-122.4, 36.9, 5] } },
      ],
    };
    const cards = parseQuakes(json, santaCruz);
    expect(cards[0]).toMatchObject({ kind: "quake", priority: 84.2, href: "u" });
    expect(cards[0].title.toLowerCase()).toContain("magnitude 4.2");
    expect(cards[0].label).toContain("santa cruz");
  });

  it("returns [] for no features", () => {
    expect(parseQuakes({ features: [] }, santaCruz)).toEqual([]);
  });
});

describe("earthquakesSource", () => {
  it("queries each location fail-soft and aggregates cards", async () => {
    const json = {
      features: [{ properties: { mag: 5, place: "near coast", time: 1, url: "u" }, geometry: { coordinates: [-122, 37, 5] } }],
    };
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true, json: async () => json });
    const ctx = buildContext(new Date("2026-06-24T00:00:00Z"), [HOME, santaCruz]);
    const cards = await earthquakesSource(ctx, fetchImpl as unknown as typeof fetch);
    expect(cards.length).toBeGreaterThan(0);
    expect(cards.every((c) => c.kind === "quake")).toBe(true);
  });

  it("a failing location does not break others", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: false, status: 500 });
    const ctx = buildContext(new Date("2026-06-24T00:00:00Z"), [santaCruz]);
    expect(await earthquakesSource(ctx, fetchImpl as unknown as typeof fetch)).toEqual([]);
  });

  it("mixed fail-soft: one location fails, another succeeds", async () => {
    const json = {
      features: [{ properties: { mag: 5, place: "near coast", time: 1, url: "u" }, geometry: { coordinates: [-122, 37, 5] } }],
    };
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce({ ok: false, status: 500 })
      .mockResolvedValueOnce({ ok: true, json: async () => json });
    const ctx = buildContext(new Date("2026-06-24T00:00:00Z"), [HOME, santaCruz]);
    const cards = await earthquakesSource(ctx, fetchImpl as unknown as typeof fetch);
    expect(cards).toHaveLength(1);
    expect(cards[0].kind).toBe("quake");
  });
});
