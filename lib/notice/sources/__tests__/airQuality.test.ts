import { describe, it, expect, vi } from "vitest";
import { airCardFor, airQualitySource } from "@/lib/notice/sources/airQuality";
import { buildContext } from "@/lib/notice/card";

const calm = { europeanAqi: 20, grassPollen: 10, birchPollen: 0 };

describe("airCardFor", () => {
  it("says nothing on an ordinary day", () => {
    expect(airCardFor(calm, "2026-06-23")).toBeNull();
  });
  it("flags high grass pollen", () => {
    const card = airCardFor({ ...calm, grassPollen: 64 }, "2026-06-23");
    expect(card?.title).toBe("high grass pollen today — one for the hay fever tablets.");
    expect(card?.kind).toBe("weather");
  });
  it("combines pollen types and takes the worse band", () => {
    expect(airCardFor({ ...calm, grassPollen: 60, birchPollen: 250 }, "2026-04-10")?.title)
      .toMatch(/^very high grass and birch pollen/);
  });
  it("falls back to poor air quality", () => {
    expect(airCardFor({ ...calm, europeanAqi: 85 }, "2026-06-23")?.title)
      .toBe("very poor air quality in Ludlow today.");
  });
  it("copes with missing readings", () => {
    expect(airCardFor({ europeanAqi: null, grassPollen: null, birchPollen: null }, "2026-06-23")).toBeNull();
  });
});

describe("airQualitySource", () => {
  it("reads today's Ludlow peak", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        hourly: {
          time: ["2026-06-23T09:00", "2026-06-23T15:00"],
          european_aqi: [20, 25], grass_pollen: [30, 120], birch_pollen: [0, 0],
        },
      }),
    });
    const cards = await airQualitySource(buildContext(new Date("2026-06-23T10:00:00Z")), fetchImpl as unknown as typeof fetch);
    expect(cards).toHaveLength(1);
    expect(cards[0].id).toBe("air-2026-06-23");
  });
});
