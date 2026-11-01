"use client";
import { useCalendar } from "@/lib/hooks/useCalendar";
import { type CalEvent } from "@/lib/sources/calendar";

function dayHeading(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "Europe/London",
  }).format(new Date(iso));
}

function timeLabel(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/London",
  }).format(new Date(iso));
}

function dayKey(iso: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}

export function CalendarFull() {
  const { events } = useCalendar();
  if (!events) return <p className="text-muted">loading…</p>;
  if (events.length === 0) return <p className="text-muted">nothing in the diary just now.</p>;

  // Group by day, preserving order (events arrive already sorted by start).
  const groups: { key: string; label: string; items: CalEvent[] }[] = [];
  for (const e of events) {
    const k = dayKey(e.start);
    let g = groups.find((x) => x.key === k);
    if (!g) {
      g = { key: k, label: dayHeading(e.start), items: [] };
      groups.push(g);
    }
    g.items.push(e);
  }

  return (
    <div className="space-y-6">
      {groups.map((g) => (
        <div key={g.key}>
          <h2 className="text-lg mb-2">{g.label.toLowerCase()}</h2>
          <ul className="space-y-1.5">
            {g.items.map((e, i) => (
              <li key={i} className="flex items-baseline gap-3 text-sm">
                <span className="w-14 shrink-0 text-muted tabular-nums">
                  {e.allDay ? "all day" : timeLabel(e.start)}
                </span>
                <span className="flex-1 leading-snug">
                  {e.title}
                  {e.location && <span className="text-xs text-muted"> · {e.location}</span>}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
