"use client";
import { Section } from "@/components/Section";
import { OCCASIONS } from "@/lib/content/occasions";
import { upcomingOccasions, type Countdown } from "@/lib/occasions";

function whenLabel(days: number): string {
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  return `in ${days} days`;
}

function detail(c: Countdown): string {
  if (c.kind === "birthday" && c.years !== undefined) return `turns ${c.years}`;
  if (c.kind === "anniversary" && c.years !== undefined) return `${c.years} years`;
  return "";
}

const ICON: Record<Countdown["kind"], string> = {
  birthday: "🎂",
  anniversary: "💛",
  event: "✨",
};

export function Occasions() {
  const items = upcomingOccasions(OCCASIONS, new Date(), 3, 150);
  if (items.length === 0) return null;

  return (
    <Section label="celebrations">
      <ul className="space-y-1.5">
        {items.map((c, i) => {
          const d = detail(c);
          return (
            <li key={i} className="flex items-baseline gap-3 text-sm">
              <span className="section-label w-20 shrink-0">{whenLabel(c.days)}</span>
              <span className="flex-1 leading-snug">
                {ICON[c.kind]} {c.name}
                {c.kind === "birthday" ? "’s birthday" : ""}
                {d && <span className="text-xs text-muted"> · {d}</span>}
              </span>
            </li>
          );
        })}
      </ul>
    </Section>
  );
}
