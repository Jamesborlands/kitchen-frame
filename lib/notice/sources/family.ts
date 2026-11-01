import { type NoticeCard, type NoticeSource } from "@/lib/notice/card";
import { upcomingOccasions, type Countdown, type Occasion } from "@/lib/occasions";
import { OCCASIONS } from "@/lib/content/occasions";

// Family birthdays and anniversaries coming up in the next two weeks — ranked
// above the everyday cards in the final week.

const WITHIN_DAYS = 14;

function title(c: Countdown): string {
  const when = c.days === 1 ? "tomorrow" : `in ${c.days} days`;
  if (c.kind === "birthday") {
    if (c.days === 0) return `Happy birthday, ${c.name}${c.years ? ` — ${c.years} today!` : "!"}`;
    return `${c.name}'s birthday is ${when}${c.years ? ` — ${c.years}!` : ""}`;
  }
  if (c.kind === "anniversary") {
    if (c.days === 0) return `Happy anniversary, ${c.name}${c.years ? ` — ${c.years} years today!` : "!"}`;
    return `${c.name}'s anniversary is ${when}`;
  }
  return c.days === 0 ? `${c.name} — today!` : `${c.name} ${when}`;
}

export function familyCards(occasions: Occasion[], now: Date): NoticeCard[] {
  return upcomingOccasions(occasions, now, 3, WITHIN_DAYS).map((c) => ({
    id: `family-${c.name}-${c.whenISO}`,
    kind: "family" as const,
    label: "family",
    title: title(c),
    priority: c.days <= 7 ? 75 - c.days : 40,
  }));
}

export const familySource: NoticeSource = async (ctx) => familyCards(ctx.occasions ?? OCCASIONS, ctx.now);
