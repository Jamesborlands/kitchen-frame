// Reminders the family sets on /family for the frame's "Happening today" card:
// "Bin day" every other Thursday, "Choir" Wednesdays at 7, "Tom in town"
// on one Saturday. Dates are Ludlow calendar dates ("YYYY-MM-DD").
import { pickColor } from "@/lib/family/colors";

export type Repeat =
  | { kind: "once"; date: string }
  | { kind: "weekly"; days: number[]; everyWeeks: 1 | 2; from: string } // days: 0 = Sunday
  | { kind: "monthly"; day: number };

export interface Reminder {
  id: string;
  text: string;
  time: string | null; // "HH:MM", or null for all day
  color: string;
  repeat: Repeat;
}

const YMD = /^\d{4}-\d{2}-\d{2}$/;
const dayNumber = (ymd: string) => Math.floor(Date.UTC(+ymd.slice(0, 4), +ymd.slice(5, 7) - 1, +ymd.slice(8, 10)) / 86_400_000);
const weekday = (ymd: string) => new Date(`${ymd}T12:00:00Z`).getUTCDay();
const daysInMonth = (ymd: string) => new Date(Date.UTC(+ymd.slice(0, 4), +ymd.slice(5, 7), 0)).getUTCDate();

export function occursOn(r: Reminder, ymd: string): boolean {
  const rep = r.repeat;
  if (rep.kind === "once") return rep.date === ymd;
  if (rep.kind === "monthly") {
    const d = +ymd.slice(8, 10);
    return d === Math.min(rep.day, daysInMonth(ymd));
  }
  if (!rep.days.includes(weekday(ymd))) return false;
  if (ymd < rep.from) return false;
  if (rep.everyWeeks === 1) return true;
  // every other week: count weeks from the Sunday of the first week
  const start = dayNumber(rep.from) - weekday(rep.from);
  return Math.floor((dayNumber(ymd) - start) / 7) % 2 === 0;
}

function repeat(x: unknown): Repeat | null {
  if (!x || typeof x !== "object") return null;
  const r = x as Record<string, unknown>;
  if (r.kind === "once") return typeof r.date === "string" && YMD.test(r.date) ? { kind: "once", date: r.date } : null;
  if (r.kind === "monthly") {
    const day = Math.round(Number(r.day));
    return day >= 1 && day <= 31 ? { kind: "monthly", day } : null;
  }
  if (r.kind === "weekly") {
    const days = Array.isArray(r.days)
      ? [...new Set(r.days.map(Number).filter((d) => Number.isInteger(d) && d >= 0 && d <= 6))].sort()
      : [];
    if (!days.length || typeof r.from !== "string" || !YMD.test(r.from)) return null;
    return { kind: "weekly", days, everyWeeks: r.everyWeeks === 2 ? 2 : 1, from: r.from };
  }
  return null;
}

export function sanitizeReminder(x: unknown): Reminder | null {
  if (!x || typeof x !== "object") return null;
  const o = x as Record<string, unknown>;
  const text = typeof o.text === "string" ? o.text.trim().slice(0, 80) : "";
  const id = typeof o.id === "string" && /^[\w-]{1,40}$/.test(o.id) ? o.id : null;
  const rep = repeat(o.repeat);
  if (!text || !id || !rep) return null;
  const time = typeof o.time === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(o.time) ? o.time : null;
  return { id, text, time, color: pickColor(o.color), repeat: rep };
}
