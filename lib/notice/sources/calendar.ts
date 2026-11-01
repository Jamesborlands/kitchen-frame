import { type NoticeCard, type NoticeSource } from "@/lib/notice/card";
import { checkCalendar } from "@/lib/family/calendars";
import { cachedEvents, defaultCalendarCache, type CalendarCache } from "@/lib/family/calendarCache";
import type { NoticeContext } from "@/lib/notice/card";
import type { CalendarLink } from "@/lib/family/settings";
import type { CalEvent } from "@/lib/sources/calendar";

// "Next up" from the family's calendars (added on /family): what's on today and
// tomorrow in Ludlow, worded the way you'd say it — "Today 2:30pm — Dentist" —
// under the calendar's name and in its colour.

const TZ = "Europe/London";
const MAX_CARDS = 4;

export interface CalendarItem {
  cal: CalendarLink;
  event: CalEvent;
}

const londonDate = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(d); // YYYY-MM-DD

function clock(d: Date): string {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "numeric", minute: "2-digit", hour12: true }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const minute = get("minute");
  return `${get("hour")}${minute === "00" ? "" : `:${minute}`}${get("dayPeriod").toLowerCase().replace(/\./g, "").replace(/\s/g, "")}`;
}

export function calendarCards(items: CalendarItem[], now: Date): NoticeCard[] {
  const today = londonDate(now);
  const tomorrow = londonDate(new Date(now.getTime() + 86_400_000));
  const rows = items.flatMap(({ cal, event }) => {
    const start = new Date(event.start);
    const day = event.allDay ? (event.date ?? event.start.slice(0, 10)) : londonDate(start);
    if (day !== today && day !== tomorrow) return [];
    if (!event.allDay && start.getTime() < now.getTime()) return []; // already started
    const when = day === today ? "Today" : "Tomorrow";
    return [{
      // all-day first within a day, then by time
      sort: `${day} ${event.allDay ? "0" : `1${event.start}`}`,
      card: {
        id: `calendar-${cal.id}-${event.start}-${event.title}`,
        kind: "calendar" as const,
        label: cal.name,
        title: `${when}${event.allDay ? "" : ` ${clock(start)}`} — ${event.title}`,
        priority: day === today ? 85 : 55,
        color: cal.color,
      },
    }];
  });
  return rows.sort((a, b) => a.sort.localeCompare(b.sort)).slice(0, MAX_CARDS).map((r) => r.card);
}

/** Every calendar's events around today and tomorrow (cached 15 min each); a broken one gives none. */
export async function calendarItemsFor(
  calendars: CalendarLink[],
  now: Date,
  fetchImpl: typeof fetch = fetch,
  cache: CalendarCache = defaultCalendarCache(),
  window?: { from: Date; days: number }, // the full calendar's month/week; default: yesterday + a fortnight
): Promise<CalendarItem[]> {
  if (!calendars.length) return [];
  // look back a day so today's all-day events (which "started" at midnight) are included
  const from = window?.from ?? new Date(now.getTime() - 86_400_000);
  const days = window?.days ?? 15;
  const results = await Promise.all(
    calendars.map(async (cal) => {
      // each window is cached on its own
      const key = window ? `${cal.url}#${from.toISOString().slice(0, 10)}/${days}` : cal.url;
      const events = await cachedEvents(key, now.getTime(), async () => {
        // a fortnight ahead: the frame's calendar panel; today's card uses the first two days of it
        const r = await checkCalendar(cal.url, from, fetchImpl, days, 400);
        return r.ok ? r.events : null;
      }, cache).catch(() => []);
      return events.map((event) => ({ cal, event }));
    }),
  );
  return results.flat();
}

export async function calendarCardsFor(
  ctx: NoticeContext,
  fetchImpl: typeof fetch = fetch,
  cache: CalendarCache = defaultCalendarCache(),
): Promise<NoticeCard[]> {
  return calendarCards(await calendarItemsFor(ctx.calendars ?? [], ctx.now, fetchImpl, cache), ctx.now);
}

export const calendarSource: NoticeSource = (ctx, fetchImpl) => calendarCardsFor(ctx, fetchImpl);
