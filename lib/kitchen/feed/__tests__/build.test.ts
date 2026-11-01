import { describe, it, expect } from "vitest";
import { buildFeed, type FeedDeps } from "@/lib/kitchen/feed/build";
import { FEED_VERSION } from "@/lib/kitchen/feed/types";
import { FAMILY_LOCATIONS } from "@/lib/config";
import type { WeatherData } from "@/lib/sources/weather";

const NOW = new Date("2026-10-11T12:00:00Z");
const W: WeatherData = {
  current: { temperature: 10, apparentTemperature: 9, weatherCode: 0, windSpeed: 1, humidity: 50, uvIndex: 1, precipitation: 0 },
  daily: [{ date: "2026-10-11", weatherCode: 0, tempMax: 12, tempMin: 5, sunrise: "2026-10-11T07:22", sunset: "2026-10-11T18:21", uvIndexMax: 2, precipitationSum: 0 }],
  hourly: [],
};

function deps(over: Partial<FeedDeps> = {}): FeedDeps {
  return {
    weather: async () => ({ value: W, fetchedAt: 42 }),
    warnings: async () => [],
    notices: async () => [{ id: "n", kind: "delight", label: "a poem", title: "t", priority: 0 }],
    frame: async () => ({ photos: [{ id: "p", url: "/api/photo?k=whatsapp/p.jpg", from: "Kate", at: 1 }], notes: [] }),
    release: async () => ({ versionCode: 7, minVersionCode: 3 }),
    serverVersion: "abc123",
    ...over,
  };
}

const boom = async (): Promise<never> => { throw new Error("down"); };

describe("buildFeed", () => {
  it("assembles every section", async () => {
    const f = await buildFeed(deps(), NOW);
    expect(f.feedVersion).toBe(FEED_VERSION);
    expect(f.generatedAt).toBe(NOW.getTime());
    expect(f.serverVersion).toBe("abc123");
    expect(f.weather?.fetchedAt).toBe(42);
    expect(f.clocks.map((c) => c.key)).toEqual(FAMILY_LOCATIONS.map((l) => l.key));
    expect(f.clockSleep).toEqual({ startHour: 23, endHour: 7 });
    expect(f.notices).toHaveLength(1);
    expect(f.noticeRotateMs).toBe(9_000);
    expect(f.photos).toHaveLength(1);
    expect(f.photoSlideMs).toBe(20_000);
    expect(f.board).toBeNull();
    expect(f.night).toEqual({ startHour: 0, endHour: 6, timeZone: "Europe/London" });
    expect(f.app).toEqual({ latestVersionCode: 7, minVersionCode: 3 });
    expect(f.photoFit).toBe("smart"); // Sam chose "smart" on the frame, 2026-10-11
  });

  it("survives every source failing at once", async () => {
    const f = await buildFeed(deps({
      weather: async () => null, warnings: boom, notices: boom, frame: boom, release: boom,
    }), NOW);
    expect(f.weather).toBeNull();
    expect(f.warning).toBeNull();
    expect(f.notices).toEqual([]);
    expect(f.photos).toEqual([]);
    expect(f.board).toBeNull();
    expect(f.app).toEqual({ latestVersionCode: null, minVersionCode: null });
    // clocks still come back — they only lose their temperature
    expect(f.clocks).toHaveLength(FAMILY_LOCATIONS.length);
    expect(f.clocks.every((c) => c.tempC === null)).toBe(true);
  });

  it("survives a weather dep that throws instead of returning null", async () => {
    const f = await buildFeed(deps({ weather: boom }), NOW);
    expect(f.weather).toBeNull();
    expect(f.clocks.every((c) => c.tempC === null)).toBe(true);
  });

  it("survives a section builder throwing on odd data", async () => {
    const broken = { ...W, daily: [] } as WeatherData; // weatherSection reads daily[0]
    const f = await buildFeed(deps({ weather: async () => ({ value: broken, fetchedAt: 1 }) }), NOW);
    expect(f.weather).toBeNull();
    expect(f.clocks[0].tempC).toBe(10);
  });
});

describe("buildFeed with /family settings", () => {
  it("takes night hours, photo speed and fit from the saved settings", async () => {
    const { defaultSettings } = await import("@/lib/family/settings");
    const f = await buildFeed(deps({
      settings: async () => ({ ...defaultSettings(), nightStartHour: 22, nightEndHour: 7, photoSlideSec: 45, photoFit: "whole" }),
    }), NOW);
    expect(f.night).toEqual({ startHour: 22, endHour: 7, timeZone: "Europe/London" });
    expect(f.photoSlideMs).toBe(45_000);
    expect(f.photoFit).toBe("whole");
  });

  it("hands the settings to the notice sources", async () => {
    const { defaultSettings } = await import("@/lib/family/settings");
    const s = { ...defaultSettings(), photoSlideSec: 45 };
    let seen: unknown = null;
    await buildFeed(deps({ settings: async () => s, notices: async (_now, settings) => { seen = settings; return []; } }), NOW);
    expect(seen).toBe(s);
  });

  it("falls back to the defaults when settings can't be read", async () => {
    const f = await buildFeed(deps({ settings: boom }), NOW);
    expect(f.photoSlideMs).toBe(20_000);
    expect(f.night.startHour).toBe(0);
  });

  it("uses a calendar card's own colour", async () => {
    const f = await buildFeed(deps({
      notices: async () => [{ id: "c", kind: "calendar", label: "Mum", title: "Today 2:30pm — Dentist", priority: 80, color: "#B0607A" }],
    }), NOW);
    expect(f.notices[0]).toMatchObject({ kind: "calendar", eyebrow: "Mum", color: "#B0607A" });
  });
});

describe("buildFeed with lots of photos", () => {
  const many = Array.from({ length: 120 }, (_, i) => ({ id: `p${i}`, url: `/api/photo?k=${i}.jpg`, from: "Kate", at: 1000 - i }));

  it("sends only the newest 40 in the feed (older app versions read these) plus a version of the full list", async () => {
    const f = await buildFeed(deps({ frame: async () => ({ photos: many, notes: [] }) }), NOW);
    expect(f.photos).toHaveLength(40);
    expect(f.photos[0].id).toBe("p0");
    expect(f.photosVersion).toMatch(/^[0-9a-f]{16}$/);
  });

  it("the version changes when the list does, and only then", async () => {
    const a = await buildFeed(deps({ frame: async () => ({ photos: many, notes: [] }) }), NOW);
    const b = await buildFeed(deps({ frame: async () => ({ photos: many, notes: [] }) }), new Date(NOW.getTime() + 60_000));
    const c = await buildFeed(deps({ frame: async () => ({ photos: many.slice(1), notes: [] }) }), NOW);
    expect(b.photosVersion).toBe(a.photosVersion);
    expect(c.photosVersion).not.toBe(a.photosVersion);
  });
});

describe("buildFeed — today, to-dos, tips", () => {
  it("carries today's card and the to-do list", async () => {
    const today = { label: "Monday 12 October", items: [{ time: "11am", text: "Mum — tennis", color: "#B0607A", kind: "reminder" as const }], tomorrow: [] };
    const f = await buildFeed(deps({
      today: async () => today,
      todos: async () => [{ id: "t1", text: "Ring the plumber", done: false, at: 1 }, { id: "t2", text: "Stamps", done: true, at: 2, doneAt: 3 }],
    }), NOW);
    expect(f.today).toEqual(today);
    expect(f.todos).toEqual([{ id: "t1", text: "Ring the plumber", done: false }, { id: "t2", text: "Stamps", done: true }]);
  });

  it("leaves the news out of the busy-day tip line unless it's switched on", async () => {
    const { defaultSettings } = await import("@/lib/family/settings");
    const cards = async () => [
      { id: "n", kind: "news" as const, label: "bbc news", title: "Grim headline", priority: 50 },
      { id: "w", kind: "weather" as const, label: "ludlow", title: "Rain from 3pm", priority: 72 },
    ];
    const off = await buildFeed(deps({ notices: cards }), NOW);
    expect(off.tips.map((n) => n.id)).toEqual(["w"]);              // the one-line extra on a busy day: no news
    expect(off.notices.map((n) => n.id)).toEqual(["n", "w"]);      // a quiet day's full card: news too (Sam, 2026-10-12)
    const on = await buildFeed(deps({ notices: cards, settings: async () => ({ ...defaultSettings(), showNews: true }) }), NOW);
    expect(on.tips.map((n) => n.id)).toEqual(["n", "w"]);
  });

  it("today and to-dos fail soft", async () => {
    const f = await buildFeed(deps({ today: boom, todos: boom }), NOW);
    expect(f.today).toBeNull();
    expect(f.todos).toEqual([]);
  });
});

describe("buildFeed for another household", () => {
  it("uses its own home and places, and says which modules are on", async () => {
    const { defaultSettingsFor } = await import("@/lib/households/defaults");
    const s = defaultSettingsFor({ label: "Bristol", latitude: 51.45, longitude: -2.59, timezone: "Europe/London", sublabel: "Sophie" });
    const asked: string[] = [];
    const f = await buildFeed(deps({
      settings: async () => s,
      weather: async (loc) => { asked.push(loc.label); return { value: W, fetchedAt: 42 }; },
    }), NOW);
    expect(asked).toEqual(["Bristol"]);           // one place: home is also its only clock
    expect(f.clocks.map((c) => c.label)).toEqual(["Bristol"]);
    expect(f.clocks[0].sceneUrl).toMatch(/^\/watercolor\/(clear|cloud)/); // no painting of Bristol: its weather's sky
    expect(f.modules).toEqual({ clocks: true, today: true, todos: true, rides: false, board: true, photos: true });
  });
});

describe("a household in another time zone", () => {
  it("night hours and 'today' follow its home, not London", async () => {
    const { defaultSettingsFor } = await import("@/lib/households/defaults");
    const s = defaultSettingsFor({ label: "Santa Cruz", latitude: 36.97, longitude: -122.03, timezone: "America/Los_Angeles" });
    const f = await buildFeed(deps({ settings: async () => s }), NOW);
    expect(f.night.timeZone).toBe("America/Los_Angeles");
  });
});

