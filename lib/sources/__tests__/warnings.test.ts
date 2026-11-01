import { describe, it, expect, vi, beforeEach } from "vitest";
import { parseWarnings, fetchWarnings, warningEndDay } from "@/lib/sources/warnings";
import { readFileSync } from "fs";
import { join } from "path";

const fixture = readFileSync(join(__dirname, "../__fixtures__/met-warnings.xml"), "utf-8");

describe("parseWarnings", () => {
  it("keeps only warnings affecting the area, deduped and severity-sorted", () => {
    const w = parseWarnings(fixture, "Shropshire");
    // fixture: Red heat (Shropshire), Amber heat (Warwickshire only), 2× Yellow thunderstorm (Shropshire)
    // → Red heat + one Yellow thunderstorm, red first
    expect(w.map((x) => x.level)).toEqual(["red", "yellow"]);
    expect(w[0]).toMatchObject({ level: "red", type: "extreme heat" });
    expect(w[0].period).toBe("from 0800 Wed 24 Jun to 2259 Thu 25 Jun");
    expect(w[1]).toMatchObject({ level: "yellow", type: "thunderstorm" });
  });

  it("excludes warnings that don't list the area", () => {
    const w = parseWarnings(fixture, "Shropshire");
    // the Amber heat is Gloucestershire-only → must not appear
    expect(w.some((x) => x.level === "amber")).toBe(false);
  });

  it("returns [] for a different area with no matches", () => {
    expect(parseWarnings(fixture, "Cornwall")).toEqual([]);
  });

  it("returns [] on garbage", () => {
    expect(parseWarnings("not xml <>")).toEqual([]);
    expect(parseWarnings("")).toEqual([]);
  });
});

describe("warningEndDay", () => {
  it("extracts the end day from a period", () => {
    expect(warningEndDay("from 0800 Wed 24 Jun to 2259 Thu 25 Jun")).toBe("Thu 25 Jun");
  });
  it("returns empty string when there's no parseable period", () => {
    expect(warningEndDay("")).toBe("");
  });
});

describe("fetchWarnings", () => {
  beforeEach(() => vi.resetAllMocks());

  it("fetches and parses for the area", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true, text: async () => fixture });
    const w = await fetchWarnings("https://example.com/wm", "Shropshire", fetchImpl as unknown as typeof fetch);
    expect(w[0].level).toBe("red");
  });

  it("throws on a non-ok response", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: false, status: 503 });
    await expect(
      fetchWarnings("https://example.com/wm", "Shropshire", fetchImpl as unknown as typeof fetch),
    ).rejects.toThrow();
  });
});
