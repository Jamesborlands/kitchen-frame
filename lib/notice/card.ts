import type { Occasion } from "@/lib/occasions";
import type { CalendarLink } from "@/lib/family/settings";
import { ALL_LOCATIONS, type GeoLocation } from "@/lib/config";

export interface NoticeCard {
  id: string;
  kind: "quake" | "weather" | "aurora" | "delight" | "news" | "family" | "sky" | "calendar";
  label: string;
  title: string;
  detail?: string;
  priority: number;
  href?: string;
  color?: string; // overrides the kind's colour (calendar cards use their calendar's)
}

export interface NoticeContext {
  now: Date;
  month: number;
  day: number;
  locations: GeoLocation[];
  // from the /family settings, when the caller has them
  occasions?: Occasion[];
  calendars?: CalendarLink[];
}

export type NoticeSource = (
  ctx: NoticeContext,
  fetchImpl?: typeof fetch,
) => Promise<NoticeCard[]>;

export function buildContext(
  now: Date = new Date(),
  locations: GeoLocation[] = ALL_LOCATIONS,
): NoticeContext {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    month: "numeric",
    day: "numeric",
  }).formatToParts(now);
  const month = Number(parts.find((p) => p.type === "month")?.value);
  const day = Number(parts.find((p) => p.type === "day")?.value);
  return { now, month, day, locations };
}
