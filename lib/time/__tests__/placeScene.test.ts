import { describe, it, expect } from "vitest";
import { placeScene, PLACE_SCENES } from "@/lib/time/season";
import { paintingFor } from "@/lib/geo/paintings";

const OCT = new Date(Date.UTC(2026, 9, 12));

describe("each place's painting follows its own four seasons", () => {
  it("Queenstown in October is spring, not snow", () => {
    expect(placeScene("place-queenstown", OCT, -45.03)).toBe("place-queenstown-spring");
  });

  it("Ludlow in October is autumn; North Berwick too", () => {
    expect(placeScene("place-ludlow", OCT, 52.37)).toBe("place-ludlow-autumn");
    expect(placeScene("place-northberwick", OCT, 56.06)).toBe("place-northberwick-autumn");
  });

  it("a place without four seasons painted falls back to its summer/winter pair", () => {
    expect(PLACE_SCENES.has("place-elsewhere-autumn")).toBe(false);
    expect(placeScene("place-elsewhere", OCT, 55.95)).toBe("place-elsewhere-summer");
    expect(placeScene("place-elsewhere", new Date(Date.UTC(2026, 0, 5)), 55.95)).toBe("place-elsewhere-winter");
  });

  it("every scene it can return is a painting we have", () => {
    for (const stem of ["place-ludlow", "place-santacruz", "place-queenstown", "place-northberwick", "place-edinburgh", "place-whistler"]) {
      for (let m = 0; m < 12; m++) {
        for (const lat of [51, -37]) expect(PLACE_SCENES.has(placeScene(stem, new Date(Date.UTC(2026, m, 15)), lat))).toBe(true);
      }
    }
  });
});

describe("a painting for a town, found by name", () => {
  it("knows the family's places, by their usual names", () => {
    expect(paintingFor("North Berwick")).toBe("place-northberwick");
    expect(paintingFor("Ludlow")).toBe("place-ludlow");
    expect(paintingFor("Santa Cruz")).toBe("place-santacruz");
    expect(paintingFor("Santa Cruz, California")).toBe("place-santacruz");
    expect(paintingFor("Queenstown")).toBe("place-queenstown");
    expect(paintingFor("Whistler")).toBe("place-whistler");
    expect(paintingFor("Edinburgh")).toBe("place-edinburgh");
    expect(paintingFor("Bristol")).toBe("");
  });
});
