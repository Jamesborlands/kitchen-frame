import { describe, it, expect } from "vitest";
import {
  buildFloodWarningsUrl,
  buildRiverStationsUrl,
  parseFloodWarnings,
  parseRiverStations,
  parseStationLevel,
  levelMeasureId,
  buildReadingsUrl,
  parseReadings,
} from "@/lib/sources/flood";
import warningsFixture from "@/lib/sources/__fixtures__/flood-warnings.json";
import stationsFixture from "@/lib/sources/__fixtures__/river-stations.json";
import measuresFixture from "@/lib/sources/__fixtures__/station-measures.json";

describe("buildFloodWarningsUrl", () => {
  it("contains the EA floods host + path", () => {
    const url = buildFloodWarningsUrl(52.3675, -2.7181, 15);
    expect(url).toContain("environment.data.gov.uk/flood-monitoring/id/floods");
  });
  it("includes lat, long, dist params", () => {
    const url = buildFloodWarningsUrl(52.3675, -2.7181, 15);
    expect(url).toContain("lat=52.3675");
    expect(url).toContain("long=-2.7181");
    expect(url).toContain("dist=15");
  });
});

describe("buildRiverStationsUrl", () => {
  it("contains the EA stations host + path", () => {
    const url = buildRiverStationsUrl(52.3675, -2.7181, 8);
    expect(url).toContain("environment.data.gov.uk/flood-monitoring/id/stations");
  });
  it("includes parameter=level", () => {
    const url = buildRiverStationsUrl(52.3675, -2.7181, 8);
    expect(url).toContain("parameter=level");
  });
  it("includes lat, long, dist params", () => {
    const url = buildRiverStationsUrl(52.3675, -2.7181, 8);
    expect(url).toContain("lat=52.3675");
    expect(url).toContain("long=-2.7181");
    expect(url).toContain("dist=8");
  });
});

describe("parseFloodWarnings", () => {
  it("maps fields from fixture correctly", () => {
    const warnings = parseFloodWarnings(warningsFixture);
    expect(warnings).toHaveLength(1);
    expect(warnings[0].severity).toBe("Flood Warning");
    expect(warnings[0].severityLevel).toBe(2);
    expect(warnings[0].area).toBe("West Midlands");
  });
  it("returns [] when items is missing", () => {
    expect(parseFloodWarnings({})).toEqual([]);
  });
  it("returns [] when items is empty", () => {
    expect(parseFloodWarnings({ items: [] })).toEqual([]);
  });
});

describe("parseRiverStations", () => {
  it("filters out items with no riverName", () => {
    const stations = parseRiverStations(stationsFixture);
    const noRiver = stations.find((s) => !s.river);
    expect(noRiver).toBeUndefined();
  });
  it("dedupes by riverName — keeps first occurrence", () => {
    // stationsFixture has two River Teme entries (index 0 and 2)
    const stations = parseRiverStations(stationsFixture);
    const temes = stations.filter((s) => s.river === "River Teme");
    expect(temes).toHaveLength(1);
    expect(temes[0].station).toBe("Ludlow Teme");
  });
  it("converts @id http:// to https:// and appends /measures", () => {
    const stations = parseRiverStations(stationsFixture);
    for (const s of stations) {
      expect(s.measuresUrl).toMatch(/^https:\/\//);
      expect(s.measuresUrl).toMatch(/\/measures$/);
    }
  });
  it("maps station, river, measuresUrl correctly", () => {
    const stations = parseRiverStations(stationsFixture);
    expect(stations[0]).toEqual({
      station: "Ludlow Teme",
      river: "River Teme",
      measuresUrl:
        "https://environment.data.gov.uk/flood-monitoring/id/stations/2625/measures",
    });
  });
  it("caps at 5 results", () => {
    const manyItems = {
      items: Array.from({ length: 10 }, (_, i) => ({
        "@id": `http://example.com/stations/${i}`,
        label: `Station ${i}`,
        riverName: `River ${i}`,
      })),
    };
    const stations = parseRiverStations(manyItems);
    expect(stations.length).toBeLessThanOrEqual(5);
  });
  it("returns [] when items is missing", () => {
    expect(parseRiverStations({})).toEqual([]);
  });
  it("handles label as array — takes first element", () => {
    const input = {
      items: [
        {
          "@id": "http://example.com/stations/1",
          label: ["Primary Label", "Secondary Label"],
          riverName: "River Test",
        },
      ],
    };
    const stations = parseRiverStations(input);
    expect(stations[0].station).toBe("Primary Label");
  });
});

describe("parseStationLevel", () => {
  it("picks the level measure and returns value + unit", () => {
    const result = parseStationLevel(measuresFixture);
    expect(result.level).toBeCloseTo(0.246, 3);
    expect(result.unit).toBe("m");
  });
  it("ignores non-level measures", () => {
    const result = parseStationLevel(measuresFixture);
    // flow measure has value 12.5 — must not return that
    expect(result.level).not.toBeCloseTo(12.5, 1);
  });
  it("returns level:null when items is empty", () => {
    const result = parseStationLevel({ items: [] });
    expect(result.level).toBeNull();
    expect(result.unit).toBe("m");
  });
  it("returns level:null when latestReading is missing", () => {
    const result = parseStationLevel({
      items: [{ parameter: "level", unitName: "m" }],
    });
    expect(result.level).toBeNull();
    expect(result.unit).toBe("m");
  });
  it("returns level:null when items is missing", () => {
    const result = parseStationLevel({});
    expect(result.level).toBeNull();
    expect(result.unit).toBe("m");
  });
  it("falls back to first item when no level parameter present", () => {
    const result = parseStationLevel({
      items: [{ parameter: "flow", latestReading: { value: 5.5 }, unitName: "m3/s" }],
    });
    expect(result.level).toBeCloseTo(5.5, 2);
    expect(result.unit).toBe("m3/s");
  });
});

describe("levelMeasureId", () => {
  it("returns the @id of the level measure, converting http to https", () => {
    const json = {
      items: [
        {
          "@id": "http://environment.data.gov.uk/flood-monitoring/id/measures/2625-level-stage-i-15_min-mASD",
          parameter: "flow",
        },
        {
          "@id": "http://environment.data.gov.uk/flood-monitoring/id/measures/2625-level-stage-i-15_min-mAOD",
          parameter: "level",
        },
      ],
    };
    const id = levelMeasureId(json);
    expect(id).toBe(
      "https://environment.data.gov.uk/flood-monitoring/id/measures/2625-level-stage-i-15_min-mAOD"
    );
  });

  it("falls back to the first item @id (http→https) when no level parameter", () => {
    const json = {
      items: [
        {
          "@id": "http://environment.data.gov.uk/flood-monitoring/id/measures/2625-flow",
          parameter: "flow",
        },
      ],
    };
    const id = levelMeasureId(json);
    expect(id).toBe(
      "https://environment.data.gov.uk/flood-monitoring/id/measures/2625-flow"
    );
  });

  it("returns null when items is empty", () => {
    expect(levelMeasureId({ items: [] })).toBeNull();
  });

  it("returns null when items is missing", () => {
    expect(levelMeasureId({})).toBeNull();
  });
});

describe("buildReadingsUrl", () => {
  it("includes the measure id and /readings path", () => {
    const url = buildReadingsUrl(
      "https://environment.data.gov.uk/flood-monitoring/id/measures/2625-level",
      "2026-06-22T21:00:00.000Z"
    );
    expect(url).toContain(
      "https://environment.data.gov.uk/flood-monitoring/id/measures/2625-level/readings"
    );
  });

  it("includes since= with the encoded ISO timestamp", () => {
    const since = "2026-06-22T21:00:00.000Z";
    const url = buildReadingsUrl(
      "https://environment.data.gov.uk/flood-monitoring/id/measures/2625-level",
      since
    );
    expect(url).toContain("since=");
    expect(url).toContain(encodeURIComponent(since));
  });

  it("includes _sorted and _limit=96", () => {
    const url = buildReadingsUrl(
      "https://environment.data.gov.uk/flood-monitoring/id/measures/2625-level",
      "2026-06-22T21:00:00.000Z"
    );
    expect(url).toContain("_sorted");
    expect(url).toContain("_limit=96");
  });
});

describe("parseReadings", () => {
  it("extracts numeric values in order", () => {
    const json = {
      items: [
        { dateTime: "2026-06-22T22:00:00Z", value: 0.24 },
        { dateTime: "2026-06-22T22:15:00Z", value: 0.25 },
        { dateTime: "2026-06-22T22:30:00Z", value: 0.27 },
      ],
    };
    expect(parseReadings(json)).toEqual([0.24, 0.25, 0.27]);
  });

  it("skips null values", () => {
    const json = {
      items: [
        { dateTime: "2026-06-22T22:00:00Z", value: 0.24 },
        { dateTime: "2026-06-22T22:15:00Z", value: null },
        { dateTime: "2026-06-22T22:30:00Z", value: 0.27 },
      ],
    };
    expect(parseReadings(json)).toEqual([0.24, 0.27]);
  });

  it("skips non-numeric (string) values", () => {
    const json = {
      items: [
        { dateTime: "2026-06-22T22:00:00Z", value: "bad" },
        { dateTime: "2026-06-22T22:15:00Z", value: 0.25 },
      ],
    };
    expect(parseReadings(json)).toEqual([0.25]);
  });

  it("returns [] when items is empty", () => {
    expect(parseReadings({ items: [] })).toEqual([]);
  });

  it("returns [] when items is missing", () => {
    expect(parseReadings({})).toEqual([]);
  });

  it("returns [] when input is not an object", () => {
    expect(parseReadings(null)).toEqual([]);
    expect(parseReadings(undefined)).toEqual([]);
  });
});
