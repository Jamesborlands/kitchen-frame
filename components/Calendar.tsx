"use client";
import Link from "next/link";
import { Section } from "@/components/Section";
import { useCalendar } from "@/lib/hooks/useCalendar";

function dayLabel(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
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

// The shared family diary (a Google Calendar iCal feed). Renders nothing until
// CALENDAR_ICAL_URL is configured, so it stays hidden rather than empty.
export function Calendar({ label = "coming up", limit = 6 }: { label?: string; limit?: number }) {
  const { events } = useCalendar();
  if (!events || events.length === 0) return null;

  return (
    <Section label={label}>
      <ul className="space-y-2">
        {events.slice(0, limit).map((e, i) => (
          <li key={i} className="flex items-baseline gap-3 text-sm">
            <span className="section-label w-24 shrink-0">{dayLabel(e.start)}</span>
            <span className="flex-1 leading-snug">
              {e.title}
              {e.location && <span className="text-xs text-muted"> · {e.location}</span>}
            </span>
            {!e.allDay && (
              <span className="shrink-0 text-xs text-muted tabular-nums">{timeLabel(e.start)}</span>
            )}
          </li>
        ))}
      </ul>
      <Link href="/calendar" className="section-label mt-3 inline-block">
        full calendar ↗
      </Link>
    </Section>
  );
}
