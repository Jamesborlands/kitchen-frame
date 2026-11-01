// Countdowns to family birthdays, anniversaries, and one-off events.

export type OccasionKind = "birthday" | "anniversary" | "event";

export interface Occasion {
  name: string; // "Kate", "Anne & Peter's wedding", "everyone in Ludlow"
  month: number; // 1-12
  day: number; // 1-31
  kind: OccasionKind;
  year?: number; // birth year (→ age) / wedding year (→ years) / the event's year
}

export interface Countdown {
  name: string;
  kind: OccasionKind;
  days: number; // 0 = today
  whenISO: string; // YYYY-MM-DD of the next occurrence
  years?: number; // age / anniversary count when known
}

const DAY = 86_400_000;

export function upcomingOccasions(
  occasions: Occasion[],
  now: Date,
  count = 3,
  withinDays = 90,
): Countdown[] {
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const out: Countdown[] = [];

  for (const o of occasions) {
    const year = now.getUTCFullYear();
    let when: number;
    if (o.kind === "event") {
      // fixed date — skip if it has already passed
      when = Date.UTC(o.year ?? year, o.month - 1, o.day);
      if (when < today) continue;
    } else {
      // birthday / anniversary — recurs each year
      when = Date.UTC(year, o.month - 1, o.day);
      if (when < today) when = Date.UTC(year + 1, o.month - 1, o.day);
    }

    const days = Math.round((when - today) / DAY);
    if (days > withinDays) continue;
    const occurrenceYear = new Date(when).getUTCFullYear();
    out.push({
      name: o.name,
      kind: o.kind,
      days,
      whenISO: new Date(when).toISOString().slice(0, 10),
      years: o.year !== undefined ? occurrenceYear - o.year : undefined,
    });
  }

  return out.sort((a, b) => a.days - b.days).slice(0, count);
}
