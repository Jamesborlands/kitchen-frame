import { describe, expect, it } from "vitest";
import { fourSeason, seasonalSkyKey } from "@/lib/weather/seasonalSky";

const LUDLOW = 52.37;
const QUEENSTOWN = -45.03;
const d = (iso: string) => new Date(`${iso}T12:00:00Z`);

describe("fourSeason", () => {
  it("uses the meteorological seasons in the north", () => {
    expect(fourSeason(d("2026-03-01"), LUDLOW)).toBe("spring");
    expect(fourSeason(d("2026-06-15"), LUDLOW)).toBe("summer");
    expect(fourSeason(d("2026-10-12"), LUDLOW)).toBe("autumn");
    expect(fourSeason(d("2026-12-01"), LUDLOW)).toBe("winter");
    expect(fourSeason(d("2027-02-28"), LUDLOW)).toBe("winter");
  });

  it("flips them in the south", () => {
    expect(fourSeason(d("2026-07-01"), QUEENSTOWN)).toBe("winter");
    expect(fourSeason(d("2026-10-12"), QUEENSTOWN)).toBe("spring");
  });
});

describe("seasonalSkyKey", () => {
  it("picks this season's version of the sky", () => {
    expect(seasonalSkyKey("rain", d("2026-10-12"), LUDLOW)).toBe("rain-autumn");
    expect(seasonalSkyKey("night", d("2026-01-12"), LUDLOW)).toBe("night-winter");
    expect(seasonalSkyKey("sunset", d("2026-07-12"), LUDLOW)).toBe("sunset-summer");
  });

  it("falls back to the all-year image when there's no seasonal one", () => {
    expect(seasonalSkyKey("snow", d("2026-07-12"), LUDLOW)).toBe("snow"); // no summer snow
    expect(seasonalSkyKey("golden", d("2026-07-12"), LUDLOW)).toBe("golden");
  });
});
