import { describe, it, expect } from "vitest";
import { buildWildlifeUrl, parseWildlife } from "@/lib/sources/wildlife";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const fixture = JSON.parse(
  readFileSync(resolve(__dirname, "../__fixtures__/inaturalist.json"), "utf-8")
) as unknown;

describe("buildWildlifeUrl", () => {
  it("contains the iNaturalist host and all required query params", () => {
    const url = buildWildlifeUrl(52.3675, -2.7181, 12);
    expect(url).toContain("https://api.inaturalist.org/v1/observations");
    expect(url).toContain("lat=52.3675");
    expect(url).toContain("lng=-2.7181");
    expect(url).toContain("radius=12");
    expect(url).toContain("per_page=48");
    expect(url).toContain("quality_grade=research");
    expect(url).toContain("photos=true");
    expect(url).toContain("geo=true");
  });
});

describe("parseWildlife", () => {
  it("returns exactly 1 sighting (filters out the entry without geojson)", () => {
    const sightings = parseWildlife(fixture);
    expect(sightings).toHaveLength(1);
  });

  it("maps name, scientific, and taxon correctly", () => {
    const [sighting] = parseWildlife(fixture);
    expect(sighting.name).toBe("sycamore");
    expect(sighting.scientific).toBe("Acer pseudoplatanus");
    expect(sighting.taxon).toBe("Plantae");
  });

  it("replaces 'square' with 'small' in the photo URL", () => {
    const [sighting] = parseWildlife(fixture);
    expect(sighting.photo).toBeDefined();
    expect(sighting.photo).toContain("small");
    expect(sighting.photo).not.toContain("square");
  });

  it("reverses geojson coordinates so lat=coords[1] and lng=coords[0]", () => {
    const [sighting] = parseWildlife(fixture);
    expect(sighting.lat).toBe(52.3675);
    expect(sighting.lng).toBe(-2.7181);
  });

  it("includes the iNaturalist observation id", () => {
    const [sighting] = parseWildlife(fixture);
    expect(sighting.id).toBe(1001);
  });

  it("skips entries with taxon: null and does not throw", () => {
    // fixture has 3 entries: id=1001 (valid), id=1002 (null geojson), id=1003 (null taxon + valid geojson)
    // only id=1001 should be returned
    expect(() => parseWildlife(fixture)).not.toThrow();
    const sightings = parseWildlife(fixture);
    expect(sightings).toHaveLength(1);
    expect(sightings[0].id).toBe(1001);
  });
});
