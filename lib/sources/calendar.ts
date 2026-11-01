import ICAL from "ical.js";

// Reads a Google Calendar "secret address in iCal format" (a .ics feed) and
// returns upcoming events — expanding recurring ones (e.g. weekly classes).
// Keyless: the family shares a private iCal URL, no OAuth.

export interface CalEvent {
  title: string;
  start: string; // ISO
  end?: string; // ISO
  allDay: boolean;
  date?: string; // all-day events: the calendar date, YYYY-MM-DD (no time-zone maths)
  location?: string;
}

// Expansion budget per recurring event: enough for a daily event that started
// decades ago (we walk from its first occurrence), small enough to bound CPU.
const MAX_STEPS = 20_000;

const cancelled = (c: ICAL.Component) => String(c.getFirstPropertyValue("status") ?? "").toUpperCase() === "CANCELLED";
const ymd = (t: ICAL.Time) => `${t.year}-${String(t.month).padStart(2, "0")}-${String(t.day).padStart(2, "0")}`;

export function parseCalendar(
  ics: string,
  now: Date,
  windowDays = 14,
  limit = 12,
): CalEvent[] {
  try {
    const comp = new ICAL.Component(ICAL.parse(ics));
    const vevents = comp.getAllSubcomponents("vevent");
    const windowEnd = new Date(now.getTime() + windowDays * 86_400_000);
    const out: CalEvent[] = [];

    // A moved or cancelled single occurrence of a repeating event comes as its own
    // VEVENT with a RECURRENCE-ID: attach it to its parent instead of listing it twice.
    const masters = new Map<string, ICAL.Event>();
    const singles: ICAL.Event[] = [];
    const exceptions: ICAL.Event[] = [];
    for (const ve of vevents) {
      const event = new ICAL.Event(ve);
      if (ve.hasProperty("recurrence-id")) exceptions.push(event);
      else if (cancelled(ve)) continue;
      else if (event.isRecurring()) masters.set(event.uid, event);
      else singles.push(event);
    }
    const orphans: ICAL.Event[] = [];
    for (const ex of exceptions) {
      const master = masters.get(ex.uid);
      if (master) master.relateException(ex);
      else orphans.push(ex);
    }

    const push = (event: ICAL.Event, startTime: ICAL.Time, endTime: ICAL.Time | null) => {
      const start = startTime.toJSDate();
      if (start < now || start > windowEnd) return;
      const allDay = startTime.isDate;
      out.push({
        title: event.summary || "(untitled)",
        start: start.toISOString(),
        end: endTime ? endTime.toJSDate().toISOString() : undefined,
        allDay,
        ...(allDay ? { date: ymd(startTime) } : {}),
        location: event.location || undefined,
      });
    };

    for (const event of singles) push(event, event.startDate, event.endDate ?? null);
    for (const event of masters.values()) {
      const it = event.iterator();
      // a moved occurrence can land up to a week after its original slot
      const stopAfter = new Date(windowEnd.getTime() + 7 * 86_400_000);
      let t: ICAL.Time | null;
      let steps = 0;
      while ((t = it.next()) && steps++ < MAX_STEPS) {
        if (t.toJSDate() > stopAfter) break;
        const d = event.getOccurrenceDetails(t);
        if (cancelled(d.item.component)) continue;
        push(d.item, d.startDate, d.endDate ?? null);
      }
    }
    for (const ex of orphans) if (!cancelled(ex.component)) push(ex, ex.startDate, ex.endDate ?? null);

    return out.sort((a, b) => a.start.localeCompare(b.start)).slice(0, limit);
  } catch {
    return [];
  }
}

export async function fetchCalendar(
  url: string,
  now: Date = new Date(),
  fetchImpl: typeof fetch = fetch,
  windowDays = 14,
  limit = 12,
): Promise<CalEvent[]> {
  const res = await fetchImpl(url);
  if (!res.ok) throw new Error(`calendar ${res.status}`);
  return parseCalendar(await res.text(), now, windowDays, limit);
}
