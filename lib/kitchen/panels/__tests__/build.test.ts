import { describe, it, expect } from "vitest";
import { buildPanels, type PanelDeps } from "@/lib/kitchen/panels/build";
import type { WeatherData } from "@/lib/sources/weather";

// 9:00 in Ludlow (BST), 1:00 in Santa Cruz, 19:00 in Queenstown
const NOW = new Date("2026-10-12T08:00:00Z");

function weather(date: string, startHour = 0): WeatherData {
  return {
    current: { temperature: 14.4, apparentTemperature: 12.6, weatherCode: 61, windSpeed: 10, humidity: 80, uvIndex: 1.4, precipitation: 0.2 },
    daily: Array.from({ length: 7 }, (_, i) => {
      const d = new Date(`${date}T12:00:00Z`);
      d.setUTCDate(d.getUTCDate() + i);
      const iso = d.toISOString().slice(0, 10);
      return { date: iso, weatherCode: i === 0 ? 61 : 0, tempMax: 15.6 + i, tempMin: 8.2, sunrise: `${iso}T07:23`, sunset: `${iso}T18:12`, uvIndexMax: 2, precipitationSum: 1 };
    }),
    hourly: Array.from({ length: 48 }, (_, i) => {
      const h = (startHour + i) % 24;
      const day = Math.floor((startHour + i) / 24);
      const d = new Date(`${date}T12:00:00Z`);
      d.setUTCDate(d.getUTCDate() + day);
      return { time: `${d.toISOString().slice(0, 10)}T${String(h).padStart(2, "0")}:00`, temp: 10 + (i % 5), precipProbability: i === 3 ? 70 : 10, weatherCode: i === 3 ? 61 : 3 };
    }),
  };
}

function deps(over: Partial<PanelDeps> = {}): PanelDeps {
  return {
    weather: async (loc) => ({ value: weather(loc.key === "santaCruz" ? "2026-10-12" : loc.key === "queenstown" ? "2026-10-12" : "2026-10-12"), fetchedAt: 1 }),
    tides: async () => [
      { time: "2026-10-12 03:10", heightFt: 4.9, type: "high" },
      { time: "2026-10-12 09:41", heightFt: 0.3, type: "low" },
    ],
    waves: async () => ({ waveHeightFt: 3.3, periodSec: 12, directionDeg: 268, waterTempF: 64 }),
    snow: async () => ({ snowDepthCm: 45, recentSnowfallCm: 12 }),
    notes: async () => [{ id: "n1", text: "see you sunday", from: "Tom", at: 5 }],
    ...over,
  };
}

const boom = async (): Promise<never> => { throw new Error("down"); };

describe("buildPanels", () => {
  it("the next 18 hours at home, from this hour, with rain chances worth mentioning", async () => {
    const p = await buildPanels(deps(), NOW);
    expect(p.weather!.hours).toHaveLength(18);
    expect(p.weather!.hours[0]).toMatchObject({ label: "now", tempC: 14 }); // 09:00 is index 9 → 10 + 9%5
    expect(p.weather!.hours[1].label).toBe("10am");
    expect(p.weather!.hours.find((h) => h.rainPct !== null)).toBeUndefined(); // the 70% hour (03:00) is in the past
  });

  it("the week ahead", async () => {
    const p = await buildPanels(deps(), NOW);
    expect(p.weather!.days.map((d) => d.label)).toEqual(["today", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]);
    expect(p.weather!.days[0]).toMatchObject({ maxC: 16, minC: 8, icon: "rain" });
  });

  it("each family place: now, the week, in its own time zone", async () => {
    const p = await buildPanels(deps(), NOW);
    const santacruz = p.places.find((x) => x.key === "santaCruz")!;
    expect(santacruz).toMatchObject({ label: "Santa Cruz", sublabel: "Sam", timeZone: "America/Los_Angeles" });
    expect(santacruz.now).toEqual({ tempC: 14, condition: "light rain", feelsC: 13, uv: 1, sunrise: "7:23am", sunset: "6:12pm", icon: "rain" });
    expect(santacruz.days).toHaveLength(7);
    expect(santacruz.sceneUrl).toMatch(/^\/watercolor\/place-santacruz-(spring|summer|autumn|winter)\.webp$/);
  });

  it("Santa Cruz gets the sea and surf", async () => {
    const p = await buildPanels(deps(), NOW);
    expect(p.places.find((x) => x.key === "santaCruz")!.extra).toEqual({
      title: "sea & surf",
      lines: ["next high tide 3:10am · 4.9ft", "next low tide 9:41am · 0.3ft", "waves 3.3ft every 12s from the W", "water 64°F"],
    });
  });

  it("Queenstown gets the snow", async () => {
    const p = await buildPanels(deps(), NOW);
    expect(p.places.find((x) => x.key === "queenstown")!.extra).toEqual({
      title: "snow",
      lines: ["snow depth 45cm", "12cm new in the last few days"],
    });
  });

  it("Ludlow and Edinburgh have no extra card", async () => {
    const p = await buildPanels(deps(), NOW);
    expect(p.places.find((x) => x.key === "ludlow")!.extra).toBeNull();
  });

  it("every source failing still gives panels that open", async () => {
    const p = await buildPanels(deps({ weather: boom, tides: boom, waves: boom, snow: boom, notes: boom }), NOW);
    expect(p.weather).toBeNull();
    expect(p.places).toHaveLength(4);
    expect(p.places[0].now).toBeNull();
    expect(p.places[0].days).toEqual([]);
    expect(p.places.find((x) => x.key === "santaCruz")!.extra).toBeNull();
    expect(p.notes).toEqual([]);
  });

  it("half a marine report is still worth showing", async () => {
    const p = await buildPanels(deps({ tides: boom }), NOW);
    expect(p.places.find((x) => x.key === "santaCruz")!.extra!.lines).toEqual(["waves 3.3ft every 12s from the W", "water 64°F"]);
  });

  it("messages in full, newest first", async () => {
    const p = await buildPanels(deps({ notes: async () => [{ id: "a", text: "one", from: "A", at: 1 }, { id: "b", text: "two", from: "B", at: 2 }] }), NOW);
    expect(p.notes.map((n) => n.text)).toEqual(["two", "one"]);
  });
});

describe("wording", () => {
  it("tides read in the order they happen", async () => {
    const p = await buildPanels(deps({ tides: async () => [
      { time: "2026-10-12 09:41", heightFt: 0.3, type: "low" },
      { time: "2026-10-12 15:10", heightFt: 4.9, type: "high" },
    ] }), NOW);
    expect(p.places.find((x) => x.key === "santaCruz")!.extra!.lines.slice(0, 2)).toEqual([
      "next low tide 9:41am · 0.3ft", "next high tide 3:10pm · 4.9ft",
    ]);
  });

  it("no snow says so plainly", async () => {
    const p = await buildPanels(deps({ snow: async () => ({ snowDepthCm: 0, recentSnowfallCm: 0 }) }), NOW);
    expect(p.places.find((x) => x.key === "queenstown")!.extra!.lines).toEqual(["no snow on the ground"]);
  });
});

describe("hour icons", () => {
  it("clear or cloudy hours after dark show the night sky", async () => {
    const w = weather("2026-10-12");
    // 19:00–20:00 local: clear at 19:00 (after the 18:12 sunset), rain at 20:00
    w.hourly = w.hourly.map((h) => (h.time.endsWith("T19:00") ? { ...h, weatherCode: 0 } : h.time.endsWith("T20:00") ? { ...h, weatherCode: 61 } : h));
    const p = await buildPanels(deps({ weather: async () => ({ value: w, fetchedAt: 1 }) }), NOW);
    const at = (label: string) => p.weather!.hours.find((h) => h.label === label)!.icon;
    expect(at("7pm")).toBe("night");
    expect(at("8pm")).toBe("rain"); // rain still reads as rain
    expect(at("10am")).toBe("overcast");
  });
});

describe("rides & walks", () => {
  it("ranks the week for a ride and suggests one for the best day", async () => {
    const p = await buildPanels(deps(), NOW);
    expect(p.rides!.days).toHaveLength(7);
    expect(p.rides!.days[0]).toMatchObject({ label: "today", verdict: expect.stringMatching(/great|good|ok|poor/) });
    expect(p.rides!.days[1].label).toBe("Tue");
    expect(p.rides!.best).toMatch(/^(today|Tue|Wed|Thu|Fri|Sat|Sun)$/);
    expect(p.rides!.suggestion).toMatchObject({ name: expect.any(String), note: expect.any(String) });
  });

  it("lists the ready-made routes by kind", async () => {
    const p = await buildPanels(deps(), NOW);
    expect(p.rides!.routes.length).toBeGreaterThan(5);
    expect(p.rides!.routes[0]).toEqual({ id: 0, name: "Ludlow town circular", kind: "chill ride", drive: false });
    expect(p.rides!.routes.some((r) => r.kind === "walk")).toBe(true);
  });

  it("no forecast, no ride ranking — but the routes are still there", async () => {
    const p = await buildPanels(deps({ weather: boom }), NOW);
    expect(p.rides!.days).toEqual([]);
    expect(p.rides!.best).toBeNull();
    expect(p.rides!.routes.length).toBeGreaterThan(5);
  });
});

describe("calendar panel", () => {
  it("carries the next two weeks", async () => {
    const agenda = [{ date: "2026-10-12", label: "Today", items: [{ time: "2:30pm", text: "Dentist · Mum", color: "#B0607A", kind: "calendar" as const }] }];
    const p = await buildPanels(deps({ agenda: async () => agenda }), NOW);
    expect(p.calendar).toEqual(agenda);
  });

  it("fails soft", async () => {
    expect((await buildPanels(deps({ agenda: boom }), NOW)).calendar).toEqual([]);
  });
});

describe("panels for another household", () => {
  it("its places; sea & surf only where a place has a tide station; no rides unless switched on", async () => {
    const { defaultSettingsFor } = await import("@/lib/households/defaults");
    const s = defaultSettingsFor({ label: "Bristol", latitude: 51.45, longitude: -2.59, timezone: "Europe/London" });
    const p = await buildPanels(deps({ settings: async () => s }), NOW);
    expect(p.places.map((x) => x.label)).toEqual(["Bristol"]);
    expect(p.places[0].extra).toBeNull();
    expect(p.rides).toBeNull();
  });

  it("the tide station and buoy come from the place", async () => {
    const asked: string[] = [];
    await buildPanels(deps({ tides: async (station: string, timeZone: string) => { asked.push(`${station} ${timeZone}`); return []; } }), NOW);
    expect(asked).toEqual(["9413745 America/Los_Angeles"]); // the station's days are the place's days
  });
});

describe("a place with no painting", () => {
  it("has no sceneUrl at all (the frame reads a JSON null as the text 'null')", async () => {
    const { defaultSettingsFor } = await import("@/lib/households/defaults");
    const s = defaultSettingsFor({ label: "Bristol", latitude: 51.45, longitude: -2.59, timezone: "Europe/London" });
    const p = await buildPanels(deps({ settings: async () => s }), NOW);
    expect("sceneUrl" in p.places[0]).toBe(false);
    expect(JSON.stringify(p.places[0])).not.toContain("sceneUrl");
  });
});

