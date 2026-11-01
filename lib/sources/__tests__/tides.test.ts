import { describe, it, expect } from "vitest";
import { buildTidesUrl, parseTides } from "@/lib/sources/tides";
import fixture from "@/lib/sources/__fixtures__/noaa-tides.json";

describe("buildTidesUrl", () => {
  it("contains the station in the URL", () => {
    const url = buildTidesUrl("9413745", "20260623", "20260624");
    expect(url).toContain("station=9413745");
  });

  it("contains product=predictions", () => {
    const url = buildTidesUrl("9413745", "20260623", "20260624");
    expect(url).toContain("product=predictions");
  });

  it("contains interval=hilo", () => {
    const url = buildTidesUrl("9413745", "20260623", "20260624");
    expect(url).toContain("interval=hilo");
  });

  it("contains datum=MLLW", () => {
    const url = buildTidesUrl("9413745", "20260623", "20260624");
    expect(url).toContain("datum=MLLW");
  });

  it("encodes begin_date and end_date", () => {
    const url = buildTidesUrl("9413745", "20260623", "20260624");
    expect(url).toContain("begin_date=20260623");
    expect(url).toContain("end_date=20260624");
  });
});

describe("parseTides", () => {
  it("maps H → high and L → low", () => {
    const events = parseTides(fixture);
    const types = events.map((e) => e.type);
    expect(types).toContain("high");
    expect(types).toContain("low");
  });

  it("returns the correct count from fixture", () => {
    const events = parseTides(fixture);
    expect(events).toHaveLength(4);
  });

  it("parses heightFt as a number", () => {
    const events = parseTides(fixture);
    events.forEach((e) => {
      expect(typeof e.heightFt).toBe("number");
    });
  });

  it("preserves the time string as-is", () => {
    const events = parseTides(fixture);
    expect(events[0].time).toBe("2026-06-23 03:42");
  });

  it("maps H→high correctly for the first high event", () => {
    const events = parseTides(fixture);
    const high = events.find((e) => e.type === "high");
    expect(high).toBeDefined();
    expect(high!.heightFt).toBeCloseTo(5.4, 1);
  });

  it("returns [] when predictions is missing", () => {
    expect(parseTides({})).toEqual([]);
    expect(parseTides({ predictions: [] })).toEqual([]);
  });
});
