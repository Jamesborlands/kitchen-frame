"use client";
import { Section } from "@/components/Section";
import { BIN_SCHEDULE } from "@/lib/content/bins";
import { nextCollections } from "@/lib/bins";

function dayLabel(date: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "Europe/London",
  }).format(new Date(`${date}T12:00:00Z`));
}

export function BinDay() {
  const cols = nextCollections(BIN_SCHEDULE, new Date(), 2);
  if (cols.length === 0) return null;
  const next = cols[0];

  return (
    <Section label="bin day">
      <p className="text-sm leading-snug">
        <span className="text-ink">{dayLabel(next.date)}</span>
        <span className="text-muted"> · {next.types.join(" + ")}</span>
      </p>
    </Section>
  );
}
