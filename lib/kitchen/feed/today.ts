// "Happening today" for the frame: the family's reminders, today's calendar
// events and birthdays, in Ludlow's day — all-day things first, then by time.
// Tomorrow's too, for when today is quiet. Pure; the feed route gathers inputs.
import type { Reminder } from "@/lib/family/reminders";
import { occursOn } from "@/lib/family/reminders";
import type { CalendarItem } from "@/lib/notice/sources/calendar";
import type { Occasion } from "@/lib/occasions";

const LONDON = "Europe/London";

export interface TodayItem { time: string; text: string; color: string; kind: "reminder" | "calendar" | "birthday" }
export interface FeedToday { label: string; items: TodayItem[]; tomorrow: TodayItem[] }

const ymdIn = (d: Date, tz: string) => new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(d);
const hhmmIn = (d: Date, tz: string) => new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(d);
const nextDay = (ymd: string) => new Date(Date.UTC(+ymd.slice(0, 4), +ymd.slice(5, 7) - 1, +ymd.slice(8, 10) + 1)).toISOString().slice(0, 10);

function clock(hhmm: string): string {
  const h = +hhmm.slice(0, 2), m = hhmm.slice(3, 5);
  return `${h % 12 === 0 ? 12 : h % 12}${m === "00" ? "" : `:${m}`}${h < 12 ? "am" : "pm"}`;
}

function occasionText(o: Occasion): string {
  if (o.kind === "birthday") return `${o.name}'s birthday`;
  if (o.kind === "anniversary") return `${o.name}'s anniversary`;
  return o.name;
}

interface Row { sort: string; item: TodayItem }

function dayItems(day: string, nowHHMM: string | null, input: { reminders: Reminder[]; calendar: CalendarItem[]; occasions: Occasion[] }, tz: string): TodayItem[] {
  const rows: Row[] = [];
  const later = (hhmm: string) => nowHHMM === null || hhmm >= nowHHMM;
  for (const o of input.occasions) {
    if (`${String(o.month).padStart(2, "0")}-${String(o.day).padStart(2, "0")}` === day.slice(5)) {
      rows.push({ sort: "0a", item: { time: "all day", text: occasionText(o), color: "#B0607A", kind: "birthday" } });
    }
  }
  for (const r of input.reminders) {
    if (!occursOn(r, day)) continue;
    if (r.time && !later(r.time)) continue;
    rows.push({ sort: r.time ? `1${r.time}` : "0b", item: { time: r.time ? clock(r.time) : "all day", text: r.text, color: r.color, kind: "reminder" } });
  }
  for (const { cal, event } of input.calendar) {
    const text = `${event.title} · ${cal.name}`;
    if (event.allDay) {
      if ((event.date ?? event.start.slice(0, 10)) === day) rows.push({ sort: "0c", item: { time: "all day", text, color: cal.color, kind: "calendar" } });
      continue;
    }
    const start = new Date(event.start);
    if (ymdIn(start, tz) !== day) continue;
    const hhmm = hhmmIn(start, tz);
    if (!later(hhmm)) continue;
    rows.push({ sort: `1${hhmm}`, item: { time: clock(hhmm), text, color: cal.color, kind: "calendar" } });
  }
  return rows.sort((a, b) => a.sort.localeCompare(b.sort)).map((r) => r.item);
}

/** `timeZone`: the household's home (London by default). */
export function buildToday(input: { now: Date; reminders: Reminder[]; calendar: CalendarItem[]; occasions: Occasion[]; timeZone?: string }): FeedToday {
  const tz = input.timeZone ?? LONDON;
  const today = ymdIn(input.now, tz);
  const label = new Intl.DateTimeFormat("en-GB", { timeZone: tz, weekday: "long", day: "numeric", month: "long" }).format(input.now);
  return {
    label,
    items: dayItems(today, hhmmIn(input.now, tz), input, tz),
    tomorrow: dayItems(nextDay(today), null, input, tz),
  };
}

export interface AgendaDay { date: string; label: string; items: TodayItem[] }

/** The calendar panel: the next `days` days that have something on (today's past things dropped). */
export function buildAgenda(input: { now: Date; days: number; reminders: Reminder[]; calendar: CalendarItem[]; occasions: Occasion[]; timeZone?: string }): AgendaDay[] {
  const tz = input.timeZone ?? LONDON;
  const out: AgendaDay[] = [];
  let day = ymdIn(input.now, tz);
  for (let i = 0; i < input.days; i++, day = nextDay(day)) {
    const items = dayItems(day, i === 0 ? hhmmIn(input.now, tz) : null, input, tz);
    if (!items.length) continue;
    const label = i === 0 ? "Today" : i === 1 ? "Tomorrow"
      : new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${day}T12:00:00Z`));
    out.push({ date: day, label, items });
  }
  return out;
}

/** The full calendar (month/week view): every day from `from` (YYYY-MM-DD), with everything on it. */
export function buildRange(input: { from: string; days: number; reminders: Reminder[]; calendar: CalendarItem[]; occasions: Occasion[]; timeZone?: string }): AgendaDay[] {
  const tz = input.timeZone ?? LONDON;
  const out: AgendaDay[] = [];
  let day = input.from;
  for (let i = 0; i < input.days; i++, day = nextDay(day)) {
    const label = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${day}T12:00:00Z`));
    out.push({ date: day, label, items: dayItems(day, null, input, tz) });
  }
  return out;
}

