import { describe, it, expect } from "vitest";
import {
  buildTrainsUrl,
  parseTrains,
  stripHtml,
} from "@/lib/sources/trains";
import fixture from "@/lib/sources/__fixtures__/huxley2-lud-shr.json";

describe("buildTrainsUrl", () => {
  it("contains LUD/to/SHR/count in the URL", () => {
    const url = buildTrainsUrl("LUD", "SHR", 6);
    expect(url).toContain("LUD/to/SHR/6");
  });

  it("uses the huxley2 host", () => {
    const url = buildTrainsUrl("LUD", "SHR", 6);
    expect(url).toContain("huxley2.azurewebsites.net");
  });

  it("includes /departures/ prefix", () => {
    const url = buildTrainsUrl("LUD", "SHR", 6);
    expect(url).toContain("/departures/");
  });
});

describe("stripHtml", () => {
  it("removes HTML tags", () => {
    expect(stripHtml("<p>Hello <b>world</b></p>")).toBe("Hello world");
  });

  it("collapses multiple whitespace", () => {
    expect(stripHtml("foo   bar")).toBe("foo bar");
  });

  it("trims leading and trailing whitespace", () => {
    expect(stripHtml("  hello  ")).toBe("hello");
  });

  it("handles self-closing tags", () => {
    expect(stripHtml("line one<br/>line two")).toBe("line one line two");
  });

  it("handles empty string", () => {
    expect(stripHtml("")).toBe("");
  });
});

describe("parseTrains", () => {
  it("maps services from fixture", () => {
    const board = parseTrains(fixture);
    expect(board.services).toHaveLength(2);
    expect(board.services[0].std).toBe("08:00");
    expect(board.services[0].etd).toBe("On time");
    expect(board.services[0].platform).toBe("1");
    expect(board.services[0].operator).toBe("Transport for Wales");
  });

  it("maps null platform to '—'", () => {
    const board = parseTrains(fixture);
    expect(board.services[1].platform).toBe("—");
  });

  it("maps etd Cancelled correctly", () => {
    const board = parseTrains(fixture);
    expect(board.services[1].etd).toBe("Cancelled");
  });

  it("strips HTML from nrccMessages", () => {
    const board = parseTrains(fixture);
    expect(board.messages).toHaveLength(1);
    expect(board.messages[0]).not.toContain("<");
    expect(board.messages[0]).toContain("Strike action");
  });

  it("handles trainServices: null → empty services", () => {
    const board = parseTrains({ trainServices: null, nrccMessages: null });
    expect(board.services).toEqual([]);
    expect(board.messages).toEqual([]);
  });

  it("handles missing trainServices key", () => {
    const board = parseTrains({ nrccMessages: [] });
    expect(board.services).toEqual([]);
  });

  it("handles nrccMessages: null → empty messages", () => {
    const board = parseTrains({ trainServices: [], nrccMessages: null });
    expect(board.messages).toEqual([]);
  });

  it("drops empty messages after stripping HTML", () => {
    const board = parseTrains({
      trainServices: [],
      nrccMessages: [{ value: "<p></p>" }, { value: "real message" }],
    });
    expect(board.messages).toHaveLength(1);
    expect(board.messages[0]).toBe("real message");
  });

  it("handles fully empty input object", () => {
    const board = parseTrains({});
    expect(board.services).toEqual([]);
    expect(board.messages).toEqual([]);
  });
});
