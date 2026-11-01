// Builds the frame's panel data. Like the feed, every piece fails soft: a dead
// source costs its own lines, never the panel.
import { defaultSettings, type FamilySettings, type Place } from "@/lib/family/settings";
import type { Loc } from "@/lib/kitchen/feed/sections";
import type { WeatherData } from "@/lib/sources/weather";
import type { TideEvent } from "@/lib/sources/tides";
import type { WaveReading } from "@/lib/sources/waves";
import type { SnowConditions } from "@/lib/sources/snow";
import type { FrameNote } from "@/lib/frame/store";
import type { LastGood } from "@/lib/kitchen/feed/lastGood";
import { describeWeather } from "@/lib/weather/codes";
import { seasonalScene } from "@/lib/time/season";
import type { KitchenPanels, PanelDay, PanelHour, PanelNow, PanelPlace, PanelRides } from "@/lib/kitchen/panels/types";
import { rateRideDays } from "@/lib/cycle/rideability";
import { CYCLING } from "@/lib/content/cycling";
import { PREMADE_ROUTES } from "@/lib/map/routes";
import type { AgendaDay } from "@/lib/kitchen/feed/today";

export interface PanelDeps {
  weather(loc: Loc, now: number): Promise<LastGood<WeatherData> | null>;
  tides(station: string, timeZone: string): Promise<TideEvent[]>; // NOAA times in the place's local clock "YYYY-MM-DD HH:MM"
  waves(buoy: string): Promise<WaveReading>;
  snow(loc: Loc): Promise<SnowConditions>;
  /** The household's settings (home, places, modules); the original household's defaults when absent. */
  settings?(): Promise<FamilySettings>;
  notes(): Promise<FrameNote[]>;
  agenda?(now: Date): Promise<AgendaDay[]>;
}

const HOURS = 18;

async function soft<T>(fallback: T, f: () => Promise<T> | T): Promise<T> {
  try {
    return await f();
  } catch {
    return fallback;
  }
}

/** The place's wall clock now, as "YYYY-MM-DDTHH:MM" (Open-Meteo and NOAA speak local time). */
function localNow(timeZone: string, now: Date): string {
  const p = new Intl.DateTimeFormat("en-CA", {
    timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(now);
  const g = (t: string) => p.find((x) => x.type === t)?.value ?? "00";
  return `${g("year")}-${g("month")}-${g("day")}T${g("hour")}:${g("minute")}`;
}

/** "07:23" or "2026-10-12T07:23" or "2026-10-12 07:23" → "7:23am" */
export function clockLabel(t: string): string {
  const hhmm = t.length > 5 ? t.slice(11, 16) : t;
  const h = Number(hhmm.slice(0, 2));
  return `${h % 12 === 0 ? 12 : h % 12}:${hhmm.slice(3, 5)}${h < 12 ? "am" : "pm"}`;
}

function hourLabel(h: number): string {
  if (h === 0) return "12am";
  if (h === 12) return "12pm";
  return h < 12 ? `${h}am` : `${h - 12}pm`;
}

const compass = (deg: number) => ["N", "NE", "E", "SE", "S", "SW", "W", "NW"][Math.round((((deg % 360) + 360) % 360) / 45) % 8];

function hours(w: WeatherData, timeZone: string, now: Date): PanelHour[] {
  const thisHour = localNow(timeZone, now).slice(0, 13);
  const start = w.hourly.findIndex((h) => h.time.slice(0, 13) >= thisHour);
  if (start < 0) return [];
  return w.hourly.slice(start, start + HOURS).map((h, i) => ({
    label: i === 0 ? "now" : hourLabel(Number(h.time.slice(11, 13))),
    tempC: Math.round(h.temp),
    rainPct: h.precipProbability >= 20 ? Math.round(h.precipProbability) : null,
    icon: hourIcon(w, h.time, h.weatherCode),
  }));
}

/** A clear or partly cloudy hour after dark reads as the night sky; everything else keeps its weather. */
function hourIcon(w: WeatherData, time: string, code: number): string {
  const key = describeWeather(code).watercolor;
  if (key !== "clear" && key !== "cloud") return key;
  const day = w.daily.find((d) => d.date === time.slice(0, 10));
  if (!day) return key;
  const hhmm = time.slice(11, 16);
  return hhmm < day.sunrise.slice(11, 16) || hhmm > day.sunset.slice(11, 16) ? "night" : key;
}

function days(w: WeatherData, timeZone: string, now: Date): PanelDay[] {
  const today = localNow(timeZone, now).slice(0, 10);
  return w.daily.filter((d) => d.date >= today).slice(0, 7).map((d) => ({
    label: d.date === today ? "today" : new Intl.DateTimeFormat("en-GB", { weekday: "short", timeZone: "UTC" }).format(new Date(`${d.date}T12:00:00Z`)),
    maxC: Math.round(d.tempMax),
    minC: Math.round(d.tempMin),
    icon: describeWeather(d.weatherCode).watercolor,
  }));
}

function nowCard(w: WeatherData): PanelNow | null {
  const today = w.daily[0];
  if (!today) return null;
  const c = w.current;
  return {
    tempC: Math.round(c.temperature),
    condition: describeWeather(c.weatherCode).label,
    feelsC: Math.round(c.apparentTemperature),
    uv: Math.round(c.uvIndex),
    sunrise: clockLabel(today.sunrise),
    sunset: clockLabel(today.sunset),
    icon: describeWeather(c.weatherCode).watercolor,
  };
}

async function marine(deps: PanelDeps, place: Place, now: Date): Promise<PanelPlace["extra"]> {
  const [tides, waves] = await Promise.all([
    place.tideStation ? soft<TideEvent[]>([], () => deps.tides(place.tideStation!, place.timezone)) : [],
    place.buoy ? soft<WaveReading | null>(null, () => deps.waves(place.buoy!)) : null,
  ]);
  const local = localNow(place.timezone, now).replace("T", " ");
  const upcoming = tides.filter((t) => t.time >= local).sort((a, b) => a.time.localeCompare(b.time));
  const lines: string[] = [];
  // the next high and the next low, in the order they happen
  const next = (["high", "low"] as const)
    .map((type) => upcoming.find((x) => x.type === type))
    .filter((t): t is TideEvent => !!t)
    .sort((a, b) => a.time.localeCompare(b.time));
  for (const t of next) lines.push(`next ${t.type} tide ${clockLabel(t.time)} · ${t.heightFt.toFixed(1)}ft`);
  if (waves?.waveHeightFt != null) {
    let s = `waves ${waves.waveHeightFt}ft`;
    if (waves.periodSec != null) s += ` every ${Math.round(waves.periodSec)}s`;
    if (waves.directionDeg != null) s += ` from the ${compass(waves.directionDeg)}`;
    lines.push(s);
  }
  if (waves?.waterTempF != null) lines.push(`water ${Math.round(waves.waterTempF)}°F`);
  return lines.length ? { title: "sea & surf", lines } : null;
}

async function snow(deps: PanelDeps, loc: Loc): Promise<PanelPlace["extra"]> {
  const s = await soft<SnowConditions | null>(null, () => deps.snow(loc));
  if (!s) return null;
  const lines: string[] = [];
  const depth = s.snowDepthCm == null ? null : Math.round(s.snowDepthCm);
  const fresh = s.recentSnowfallCm == null ? null : Math.round(s.recentSnowfallCm);
  if (depth === 0) lines.push("no snow on the ground");
  else if (depth != null) lines.push(`snow depth ${depth}cm`);
  if (fresh) lines.push(`${fresh}cm new in the last few days`);
  return lines.length ? { title: "snow", lines } : null;
}

const ROUTE_KIND: Record<string, PanelRides["routes"][number]["kind"]> = {
  trekking: "chill ride", mtb: "off-road", gravel: "gravel", "hiking-mountain": "walk",
};

/** The week for a ride (lib/cycle/rideability, as /ride), a suggestion for the best day, and the ready-made routes. */
function rides(w: WeatherData | null, now: Date, timeZone: string): PanelRides {
  const today = localNow(timeZone, now).slice(0, 10);
  const days = w ? rateRideDays(w.daily.filter((d) => d.date >= today).slice(0, 7)).map((r) => ({
    label: r.date === today ? "today" : r.weekday,
    verdict: r.verdict,
    tempC: Math.round(r.tempMax),
    rainMm: Math.round(r.precip),
  })) : [];
  const bestDay = w ? rateRideDays(w.daily.filter((d) => d.date >= today).slice(0, 7))
    .reduce<{ i: number; score: number } | null>((b, r, i) => (r.score >= 55 && (!b || r.score > b.score) ? { i, score: r.score } : b), null) : null;
  // the same day always suggests the same ride (like /ride)
  const doy = Math.floor(Date.UTC(+today.slice(0, 4), +today.slice(5, 7) - 1, +today.slice(8, 10)) / 86_400_000);
  const pick = CYCLING[(doy + (bestDay?.i ?? 0)) % CYCLING.length];
  return {
    days,
    best: bestDay ? days[bestDay.i].label : null,
    suggestion: { name: pick.name, distance: pick.distance ?? "", note: pick.note ?? "" },
    routes: PREMADE_ROUTES.map((r, id) => ({ id, name: r.name, kind: ROUTE_KIND[r.profile] ?? "chill ride", drive: Boolean(r.drive) })),
  };
}

export async function buildPanels(deps: PanelDeps, now: Date): Promise<KitchenPanels> {
  const t = now.getTime();
  const settings = await soft(defaultSettings(), () => (deps.settings ? deps.settings() : defaultSettings()));
  const locs: Place[] = [settings.home, ...settings.places].filter((l, i, all) => all.findIndex((x) => x.key === l.key) === i);
  const weathers = await Promise.all(locs.map((loc) => soft(null, () => deps.weather(loc, t))));
  const weatherAt = (l: Loc) => weathers[locs.findIndex((x) => x.key === l.key)]?.value ?? null;
  const places: PanelPlace[] = await Promise.all(settings.places.map(async (loc) => {
    const w = weatherAt(loc);
    return {
      key: loc.key,
      label: loc.label,
      sublabel: loc.sublabel,
      timeZone: loc.timezone,
      // no painting of this place: no key at all (the frame reads a JSON null as the text "null")
      ...(loc.watercolor ? { sceneUrl: `/watercolor/${seasonalScene(loc.watercolor, now, loc.latitude)}.webp` } : {}),
      now: w ? await soft(null, () => nowCard(w)) : null,
      days: w ? await soft([], () => days(w, loc.timezone, now)) : [],
      extra: loc.extra === "marine" ? await soft(null, () => marine(deps, loc, now))
        : loc.extra === "snow" ? await soft(null, () => snow(deps, loc))
        : null,
    };
  }));
  const home = weatherAt(settings.home);
  const notes = await soft<FrameNote[]>([], () => deps.notes());
  return {
    generatedAt: t,
    rides: settings.modules.rides ? await soft(null, () => rides(home, now, settings.home.timezone)) : null,
    calendar: await soft<AgendaDay[]>([], () => (deps.agenda ? deps.agenda(now) : [])),
    weather: home ? await soft(null, () => ({ hours: hours(home, settings.home.timezone, now), days: days(home, settings.home.timezone, now) })) : null,
    places,
    notes: [...notes].sort((a, b) => b.at - a.at).map((n) => ({ id: n.id, text: n.text, from: n.from, at: n.at })),
  };
}
