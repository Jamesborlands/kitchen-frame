"use client";
import { Section } from "@/components/Section";
import { useWeather } from "@/lib/hooks/useWeather";
import { HOME } from "@/lib/config";
import { bestWalkWindow, type WalkWindow } from "@/lib/weather/walk";

function fmtHour(iso: string): string {
  const h = parseInt(iso.slice(11, 13), 10);
  if (h === 0) return "12am";
  if (h < 12) return `${h}am`;
  if (h === 12) return "12pm";
  return `${h - 12}pm`;
}

function londonHourKey(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/London",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const g = (t: string) => parts.find((x) => x.type === t)?.value ?? "00";
  return `${g("year")}-${g("month")}-${g("day")}T${g("hour")}`;
}

const LEAD: Record<WalkWindow["tone"], string> = {
  good: "a lovely window —",
  okay: "best window —",
  grim: "tricky today —",
};

// Pure view, kept separate so it's deterministic to test.
export function BrambleWalkView({ window }: { window: WalkWindow | null }) {
  if (!window) return null;
  return (
    <Section label="bramble's walk">
      <p className="text-sm leading-snug">
        {LEAD[window.tone]}{" "}
        <span className="text-ink">
          {fmtHour(window.start)}–{fmtHour(window.end)}
        </span>
        <span className="text-muted"> · {window.summary}</span>
      </p>
    </Section>
  );
}

export function BrambleWalk() {
  const { data } = useWeather(HOME);
  const window =
    data?.hourly?.length && data.daily?.[0]
      ? bestWalkWindow(data.hourly, data.daily[0], londonHourKey())
      : null;
  return <BrambleWalkView window={window} />;
}
