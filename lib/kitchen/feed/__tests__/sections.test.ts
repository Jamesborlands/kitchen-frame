import { describe, it, expect } from "vitest";
import {
  weatherSection, clockSection, warningSection, noticesSection, photosSection, boardSection,
  KITCHEN_BOARD,
} from "@/lib/kitchen/feed/sections";
import type { WeatherData } from "@/lib/sources/weather";
import { FAMILY_LOCATIONS, HOME } from "@/lib/config";

// 2026-10-11 13:00 London (BST, UTC+1) = 12:00 UTC
const NOON = new Date("2026-10-11T12:00:00Z");

const weather: WeatherData = {
  current: { temperature: 14.6, apparentTemperature: 12.2, weatherCode: 61, windSpeed: 10, humidity: 80, uvIndex: 2.6, precipitation: 0.3 },
  daily: [{ date: "2026-10-11", weatherCode: 61, tempMax: 15.4, tempMin: 7.6, sunrise: "2026-10-11T07:22", sunset: "2026-10-11T18:21", uvIndexMax: 3, precipitationSum: 4 }],
  hourly: [
    { time: "2026-10-11T13:00", temp: 14, precipProbability: 10, weatherCode: 3 },
    { time: "2026-10-11T15:00", temp: 14, precipProbability: 70, weatherCode: 61 },
  ],
};

describe("weatherSection", () => {
  it("builds the hero text and scene from the site's own logic", () => {
    const w = weatherSection(weather, 1000, NOON);
    expect(w.sceneUrl).toBe("/watercolor/rain-autumn.webp"); // rain, in October
    expect(w.tempC).toBe(15);
    expect(w.summary).toBe("light rain · feels 12°");
    expect(w.todayLine).toBe("high 15° · low 8° · rain likely from 3pm");
    expect(w.uv).toBe("uv 3");
    expect(w.sun).toBe("↑ 07:22 · ↓ 18:21");
    expect(w.moon).toMatch(/^moon — .+ · \d+% lit$/);
    expect(w.fetchedAt).toBe(1000);
  });

  it("uses the night scene after dark", () => {
    const night = new Date("2026-10-11T22:30:00Z"); // 23:30 London
    expect(weatherSection(weather, 0, night).sceneUrl).toBe("/watercolor/night-autumn.webp");
  });

  it("omits the rain clause when there's nothing to say", () => {
    const dry = { ...weather, hourly: [{ time: "2026-10-11T13:00", temp: 14, precipProbability: 25, weatherCode: 3 }] };
    expect(weatherSection(dry, 0, NOON).todayLine).toBe("high 15° · low 8°");
  });
});

describe("clockSection", () => {
  it("carries the seasonal place scene and current conditions", () => {
    const c = clockSection(HOME, weather, NOON);
    expect(c).toEqual({
      key: "ludlow", label: "Ludlow", sublabel: "Anne & Peter", timeZone: "Europe/London",
      sceneUrl: "/watercolor/place-ludlow-autumn.webp", tempC: 15, condition: "light rain",
    });
  });

  it("has null weather when the place's forecast failed", () => {
    const c = clockSection(FAMILY_LOCATIONS[3], null, NOON);
    expect(c.tempC).toBeNull();
    expect(c.condition).toBeNull();
    expect(c.sceneUrl).toBe("/watercolor/place-queenstown-spring.webp"); // October is spring down south
  });
});

describe("warningSection", () => {
  it("is null with no warnings", () => {
    expect(warningSection([])).toBeNull();
  });
  it("describes the first warning in the banner's words and tones", () => {
    expect(warningSection([{ level: "amber", type: "rain", period: "from 0800 Wed 24 Jun to 2259 Thu 25 Jun", link: "" }]))
      .toEqual({ level: "amber", title: "amber weather warning", detail: "rain until Thu 25 Jun", bg: "#F2E5CF", fg: "#7E5622", dot: "#C0833A" });
  });
});

describe("noticesSection", () => {
  it("maps cards with their kind colour, falling back for unknown kinds", () => {
    const out = noticesSection([
      { id: "a", kind: "quake", label: "earthquake", title: "M5 off Japan", priority: 1 },
      { id: "b", kind: "mystery" as "delight", label: "x", title: "y", detail: "z", priority: 0 },
    ]);
    expect(out[0]).toEqual({ id: "a", kind: "quake", eyebrow: "earthquake", headline: "M5 off Japan", detail: null, color: "#B0504A" });
    expect(out[1].color).toBe("#6B7C6B");
    expect(out[1].detail).toBe("z");
  });
});

describe("photosSection", () => {
  it("a photo with no known sender gets no badge", () => {
    expect(photosSection({ photos: [{ id: "1", url: "/u", from: "", at: 5 }], notes: [] })[0].initials).toBe("");
  });

  it("lists photos newest-first as the store gives them, with initials", () => {
    const out = photosSection({ photos: [{ id: "1", url: "/api/photo?k=whatsapp/a.jpg", from: "Kate Hart", at: 5 }], notes: [] });
    expect(out).toEqual([{ id: "1", url: "/api/photo?k=whatsapp/a.jpg", from: "Kate Hart", initials: "KH", at: 5, lovableUntil: null, loved: false }]);
  });
});

describe("boardSection", () => {
  it("is null when there are no notes (the kitchen hides the board)", () => {
    expect(boardSection([])).toBeNull();
  });

  it("paginates up to five recent notes at the kitchen board size", () => {
    const notes = Array.from({ length: 7 }, (_, i) => ({ id: `${i}`, text: `NOTE ${i}`, from: "Sam", at: 100 - i }));
    const b = boardSection(notes)!;
    expect(b.rows).toBe(KITCHEN_BOARD.rows);
    expect(b.cols).toBe(KITCHEN_BOARD.cols);
    expect(b.rotateMs).toBe(30_000);
    expect(b.pages).toHaveLength(5);
    expect(b.pages[0]).toEqual({ lines: ["NOTE 0"], from: "Sam", initials: "SA" });
  });

  it("splits a long note over several pages, never wider than the board", () => {
    const b = boardSection([{ id: "x", text: "the quick brown fox jumps over the lazy dog again and again", from: "Kate", at: 1 }])!;
    expect(b.pages.length).toBeGreaterThan(1);
    for (const p of b.pages) {
      expect(p.lines.length).toBeLessThanOrEqual(KITCHEN_BOARD.rows);
      for (const l of p.lines) expect(l.length).toBeLessThanOrEqual(KITCHEN_BOARD.cols);
    }
  });
});
