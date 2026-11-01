// The few things the household can change from /family: night hours, photo
// speed and fit, family birthdays, and which calendars show on the frame.
// One KV record. Everything is sanitized on the way in AND on the way out, so a
// bad or old record can only ever fall back to the defaults in lib/config.ts —
// nothing saved here can break the frame.
import { bindings } from "@/lib/cloudflare/bindings";
import { FAMILY_LOCATIONS, HOME, KITCHEN } from "@/lib/config";
import { OCCASIONS } from "@/lib/content/occasions";
import { PHOTO_SLIDE_MS } from "@/lib/kitchen/feed/sections";
import type { Occasion, OccasionKind } from "@/lib/occasions";

export type PhotoFit = "smart" | "whole" | "fill";

export interface CalendarLink {
  id: string;
  name: string; // "Mum", "Home"
  url: string; // https iCal feed (webcal rewritten)
  color: string; // one of CALENDAR_COLORS
}

/** A place on the frame: home (the weather picture) or a family clock. */
export interface Place {
  key: string;
  label: string;        // "Santa Cruz"
  sublabel: string;     // who's there: "Sam"
  latitude: number;
  longitude: number;
  timezone: string;     // IANA, e.g. "America/Los_Angeles"
  watercolor: string;   // painted scene stem in /public/watercolor ("" = use the weather sky)
  extra: "marine" | "snow" | null; // Santa Cruz's sea & surf, Queenstown's snow
  tideStation?: string; // NOAA, for marine
  buoy?: string;        // NDBC, for marine
}

export interface Modules { clocks: boolean; today: boolean; todos: boolean; rides: boolean; board: boolean; photos: boolean }
export const MODULE_KEYS: (keyof Modules)[] = ["clocks", "today", "todos", "rides", "board", "photos"];

export interface FamilySettings {
  nightStartHour: number;
  nightEndHour: number;
  photoSlideSec: number;
  photoFit: PhotoFit;
  occasions: Occasion[];
  calendars: CalendarLink[];
  reminders: Reminder[];
  showNews: boolean; // headlines in the frame's rotating tips (off: they can be grim)
  home: Place;
  places: Place[];   // the family clocks (up to 4)
  modules: Modules;
}

const EXTRAS: Record<string, Pick<Place, "extra" | "tideStation" | "buoy">> = {
  santaCruz: { extra: "marine", tideStation: "9413745", buoy: "46236" }, // NOAA Santa Cruz (Monterey Bay) tides; NDBC Monterey Canyon Outer waves
  queenstown: { extra: "snow" },
};

export function placeFromConfig(l: typeof HOME): Place {
  return {
    key: l.key, label: l.label, sublabel: l.sublabel, latitude: l.latitude, longitude: l.longitude, timezone: l.timezone,
    watercolor: l.watercolor, ...(EXTRAS[l.key] ?? { extra: null }),
  };
}

import { CALENDAR_COLORS, pickColor } from "@/lib/family/colors";
import { sanitizeReminder, type Reminder } from "@/lib/family/reminders";

export { CALENDAR_COLORS };

const MAX_CALENDARS = 20;
const MAX_OCCASIONS = 60;
const MAX_REMINDERS = 60;
const MAX_NAME = 60;
const MAX_URL = 2048;
const FITS: PhotoFit[] = ["smart", "whole", "fill"];
const KINDS: OccasionKind[] = ["birthday", "anniversary", "event"];
const KEY = "family:settings";

export function defaultSettings(): FamilySettings {
  return {
    nightStartHour: KITCHEN.nightStartHour,
    nightEndHour: KITCHEN.nightEndHour,
    photoSlideSec: PHOTO_SLIDE_MS / 1000,
    photoFit: KITCHEN.photoFit,
    occasions: OCCASIONS.map((o) => ({ ...o })),
    calendars: [],
    reminders: [],
    showNews: false,
    home: placeFromConfig(HOME),
    places: FAMILY_LOCATIONS.map(placeFromConfig),
    modules: { clocks: true, today: true, todos: true, rides: true, board: true, photos: true },
  };
}

const isNum = (x: unknown): x is number => typeof x === "number" && Number.isFinite(x);
const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, Math.round(x)));
const text = (x: unknown): string | null => {
  if (typeof x !== "string") return null;
  const t = x.trim().slice(0, MAX_NAME);
  return t ? t : null;
};

/** Google gives https://…/basic.ics; Apple gives webcal://…. Only those two schemes, ever. */
export function normalizeCalendarUrl(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  let s = raw.trim();
  if (s.length > MAX_URL) return null;
  if (/^webcal:\/\//i.test(s)) s = `https://${s.slice("webcal://".length)}`;
  try {
    const u = new URL(s);
    return u.protocol === "https:" && u.hostname ? u.toString() : null;
  } catch {
    return null;
  }
}

export function daysInMonth(month: number): number {
  return [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1];
}

function occasion(x: unknown): Occasion | null {
  if (!x || typeof x !== "object") return null;
  const o = x as Record<string, unknown>;
  const name = text(o.name);
  if (!name || !isNum(o.month) || !isNum(o.day)) return null;
  const month = Math.round(o.month);
  const day = Math.round(o.day);
  if (month < 1 || month > 12 || day < 1 || day > daysInMonth(month)) return null;
  if (!KINDS.includes(o.kind as OccasionKind)) return null;
  const out: Occasion = { name, month, day, kind: o.kind as OccasionKind };
  if (isNum(o.year) && o.year >= 1900 && o.year <= 2200) out.year = Math.round(o.year);
  return out;
}

function calendar(x: unknown): CalendarLink | null {
  if (!x || typeof x !== "object") return null;
  const c = x as Record<string, unknown>;
  const name = text(c.name);
  const url = normalizeCalendarUrl(c.url);
  const id = typeof c.id === "string" && /^[\w-]{1,40}$/.test(c.id) ? c.id : null;
  if (!name || !url || !id) return null;
  return { id, name, url, color: pickColor(c.color) };
}

// one cleaner per scalar field: the clean value, or undefined if unusable
type Scalar = "nightStartHour" | "nightEndHour" | "photoSlideSec" | "photoFit" | "showNews";
const SCALARS: { [K in Scalar]: (v: unknown) => FamilySettings[K] | undefined } = {
  nightStartHour: (v) => (isNum(v) ? clamp(v, 0, 23) : undefined),
  nightEndHour: (v) => (isNum(v) ? clamp(v, 0, 23) : undefined),
  photoSlideSec: (v) => (isNum(v) ? clamp(v, 5, 300) : undefined),
  photoFit: (v) => (FITS.includes(v as PhotoFit) ? (v as PhotoFit) : undefined),
  showNews: (v) => (typeof v === "boolean" ? v : undefined),
};
const SCALAR_KEYS = Object.keys(SCALARS) as Scalar[];

function withScalars(base: FamilySettings, r: Record<string, unknown>): FamilySettings {
  const out = { ...base };
  for (const k of SCALAR_KEYS) {
    const v = SCALARS[k](r[k]);
    if (v !== undefined) (out as Record<Scalar, unknown>)[k] = v;
  }
  return out;
}

function validTimeZone(tz: unknown): tz is string {
  if (typeof tz !== "string" || !tz) return false;
  try { new Intl.DateTimeFormat("en-GB", { timeZone: tz }); return true; } catch { return false; }
}

export function sanitizePlace(x: unknown): Place | null {
  if (!x || typeof x !== "object") return null;
  const o = x as Record<string, unknown>;
  const label = text(o.label);
  const key = typeof o.key === "string" && /^[\w-]{1,40}$/.test(o.key) ? o.key : null;
  if (!label || !key || !isNum(o.latitude) || !isNum(o.longitude) || !validTimeZone(o.timezone)) return null;
  if (Math.abs(o.latitude) > 90 || Math.abs(o.longitude) > 180) return null;
  const extra = o.extra === "marine" || o.extra === "snow" ? o.extra : null;
  const p: Place = {
    key, label, sublabel: typeof o.sublabel === "string" ? o.sublabel.trim().slice(0, MAX_NAME) : "",
    latitude: o.latitude, longitude: o.longitude, timezone: o.timezone as string,
    watercolor: typeof o.watercolor === "string" && /^[\w-]{0,60}$/.test(o.watercolor) ? o.watercolor : "",
    extra,
  };
  if (extra === "marine") {
    if (typeof o.tideStation === "string" && /^\d{5,9}$/.test(o.tideStation)) p.tideStation = o.tideStation;
    if (typeof o.buoy === "string" && /^[\w]{3,8}$/.test(o.buoy)) p.buoy = o.buoy;
  }
  return p;
}

function modules(x: unknown, base: Modules): Modules {
  const out = { ...base };
  if (x && typeof x === "object") {
    for (const k of MODULE_KEYS) { const v = (x as Record<string, unknown>)[k]; if (typeof v === "boolean") out[k] = v; }
  }
  return out;
}

export function sanitizeSettings(raw: unknown): FamilySettings {
  const d = defaultSettings();
  if (!raw || typeof raw !== "object") return d;
  const r = raw as Record<string, unknown>;
  const list = <T>(x: unknown, f: (v: unknown) => T | null, max: number): T[] | null =>
    Array.isArray(x) ? x.map(f).filter((v): v is T => v !== null).slice(0, max) : null;
  return {
    ...withScalars(d, r),
    occasions: list(r.occasions, occasion, MAX_OCCASIONS) ?? d.occasions,
    calendars: list(r.calendars, calendar, MAX_CALENDARS) ?? d.calendars,
    reminders: list(r.reminders, sanitizeReminder, MAX_REMINDERS) ?? d.reminders,
    home: sanitizePlace(r.home) ?? d.home,
    places: list(r.places, sanitizePlace, 4) ?? d.places,
    modules: modules(r.modules, d.modules),
  };
}

export interface SettingsPatch {
  nightStartHour?: unknown;
  nightEndHour?: unknown;
  photoSlideSec?: unknown;
  photoFit?: unknown;
  addCalendar?: unknown; // { name, url, color } — the id is made here
  removeCalendar?: unknown; // id
  addOccasion?: unknown;
  addReminder?: unknown; // the id is made here
  removeReminder?: unknown; // id
  showNews?: unknown;
  modules?: unknown;   // partial: { clocks: false }
  home?: unknown;
  places?: unknown;    // the whole list (up to 4)
  removeOccasion?: unknown; // matched on name + date + kind
}

const sameOccasion = (a: Occasion, b: Occasion) =>
  a.name === b.name && a.month === b.month && a.day === b.day && a.kind === b.kind;

/**
 * Apply one change from /family. Each tab sends only what it changed (a field, or
 * add/remove one item), so two people editing at once don't undo each other.
 */
export function patchSettings(current: FamilySettings, raw: unknown): FamilySettings {
  if (!raw || typeof raw !== "object") return current;
  const p = raw as SettingsPatch;
  let calendars = current.calendars;
  if (typeof p.removeCalendar === "string") calendars = calendars.filter((c) => c.id !== p.removeCalendar);
  if (p.addCalendar && typeof p.addCalendar === "object" && calendars.length < MAX_CALENDARS) {
    const added = calendar({ ...(p.addCalendar as object), id: `cal-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}` });
    if (added) calendars = [...calendars, added];
  }
  let occasions = current.occasions;
  const remove = occasion(p.removeOccasion);
  if (remove) occasions = occasions.filter((o) => !sameOccasion(o, remove));
  const add = occasion(p.addOccasion);
  if (add && occasions.length < MAX_OCCASIONS) occasions = [...occasions, add];
  let reminders = current.reminders;
  if (typeof p.removeReminder === "string") reminders = reminders.filter((r) => r.id !== p.removeReminder);
  if (p.addReminder && typeof p.addReminder === "object" && reminders.length < MAX_REMINDERS) {
    const added = sanitizeReminder({ ...(p.addReminder as object), id: `rem-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}` });
    if (added) reminders = [...reminders, added];
  }
  const places = Array.isArray(p.places) ? p.places.map(sanitizePlace).filter((x): x is Place => !!x).slice(0, 4) : current.places;
  // a junk field keeps what was there
  return {
    ...withScalars(current, p as Record<string, unknown>), calendars, occasions, reminders,
    modules: modules(p.modules, current.modules),
    home: sanitizePlace(p.home) ?? current.home,
    places,
  };
}

// ---- storage: KV when bound, else memory ----
let memory: unknown = null;

export async function getSettings(): Promise<FamilySettings> {
  const kv = bindings().FRAME;
  const raw = kv ? await kv.get(KEY, "json") : memory;
  return sanitizeSettings(raw);
}

export async function saveSettings(next: unknown): Promise<FamilySettings> {
  const clean = sanitizeSettings(next);
  const kv = bindings().FRAME;
  if (kv) await kv.put(KEY, JSON.stringify(clean));
  else memory = clean;
  return clean;
}

/** Read, apply one /family change, save. */
export async function updateSettings(patch: unknown): Promise<FamilySettings> {
  return saveSettings(patchSettings(await getSettings(), patch));
}

