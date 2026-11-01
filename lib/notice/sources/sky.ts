import { type NoticeCard, type NoticeSource } from "@/lib/notice/card";
import { moonPhase } from "@/lib/time/moon";

// Things worth looking up for over Ludlow: the big annual meteor showers (in
// the two nights before and the night of their peak) and full moons by their
// traditional names.

const DAY = 86_400_000;

// month (1-12), peak day — the major annual showers
const SHOWERS: { name: string; month: number; day: number; note: string }[] = [
  { name: "Quadrantids", month: 1, day: 3, note: "up to 80 an hour after midnight" },
  { name: "Lyrids", month: 4, day: 22, note: "look east after 10pm" },
  { name: "Eta Aquariids", month: 5, day: 6, note: "best just before dawn" },
  { name: "Perseids", month: 8, day: 12, note: "the summer favourite — up to 100 an hour" },
  { name: "Orionids", month: 10, day: 21, note: "dust from Halley's Comet — best after midnight" },
  { name: "Leonids", month: 11, day: 17, note: "fast and bright, best before dawn" },
  { name: "Geminids", month: 12, day: 14, note: "the year's best shower — look up from 9pm" },
];

const MOON_NAMES = [
  "Wolf Moon", "Snow Moon", "Worm Moon", "Pink Moon", "Flower Moon", "Strawberry Moon",
  "Buck Moon", "Sturgeon Moon", "Harvest Moon", "Hunter's Moon", "Beaver Moon", "Cold Moon",
];

function utcDay(d: Date): number {
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

export function skyCards(now: Date): NoticeCard[] {
  const out: NoticeCard[] = [];
  const today = utcDay(now);

  for (const s of SHOWERS) {
    const peak = Date.UTC(now.getUTCFullYear(), s.month - 1, s.day);
    const daysToPeak = Math.round((peak - today) / DAY);
    if (daysToPeak < 0 || daysToPeak > 2) continue;
    out.push({
      id: `sky-${s.name}-${now.getUTCFullYear()}`,
      kind: "sky",
      label: "in the sky",
      title: daysToPeak === 0
        ? `The ${s.name} meteor shower peaks tonight — ${s.note}.`
        : `The ${s.name} meteor shower peaks ${daysToPeak === 1 ? "tomorrow night" : "in two nights"} — ${s.note}.`,
      priority: 55,
    });
  }

  // full moon: the day this month's illumination peaks
  const noon = (t: number) => moonPhase(new Date(t + DAY / 2)).illumination;
  const lit = noon(today);
  if (lit > 0.98 && lit >= noon(today - DAY) && lit >= noon(today + DAY)) {
    out.push({
      id: `sky-fullmoon-${new Date(today).toISOString().slice(0, 10)}`,
      kind: "sky",
      label: "in the sky",
      title: `Full moon tonight — the ${MOON_NAMES[now.getUTCMonth()]}.`,
      priority: 50,
    });
  }
  return out;
}

export const skySource: NoticeSource = async (ctx) => skyCards(ctx.now);
