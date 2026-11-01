// Computes the next bin collections from a simple fortnightly schedule rule —
// robust and dependency-free (no fragile council scraping). Most UK councils
// collect on a fixed weekday with bins alternating week A /
// week B, plus anything weekly.

export type BinWeek = "A" | "B" | "every";

export interface BinType {
  name: string; // "general waste", "recycling", "garden"
  week: BinWeek;
}

export interface BinSchedule {
  weekday: number; // 0=Sun … 6=Sat — the collection day
  anchor: string; // YYYY-MM-DD of a known *week A* collection
  types: BinType[];
}

export interface Collection {
  date: string; // YYYY-MM-DD
  types: string[];
}

const DAY = 86_400_000;

export function nextCollections(
  schedule: BinSchedule | null,
  now: Date,
  count = 3,
): Collection[] {
  if (!schedule || schedule.types.length === 0) return [];

  // start from today (UTC, date-only) and walk forward to the collection weekday
  let d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  while (d.getUTCDay() !== schedule.weekday) d = new Date(d.getTime() + DAY);

  const anchor = new Date(`${schedule.anchor}T00:00:00Z`);
  const out: Collection[] = [];
  for (let i = 0; i < count; i++) {
    const weeks = Math.round((d.getTime() - anchor.getTime()) / (7 * DAY));
    const isWeekA = (((weeks % 2) + 2) % 2) === 0;
    const types = schedule.types
      .filter((t) => t.week === "every" || t.week === (isWeekA ? "A" : "B"))
      .map((t) => t.name);
    if (types.length > 0) out.push({ date: d.toISOString().slice(0, 10), types });
    d = new Date(d.getTime() + 7 * DAY);
  }
  return out;
}
