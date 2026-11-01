import type { DailyForecast, HourlyForecast } from "@/lib/sources/weather";

// The rest-of-today line under the kitchen weather: "high 21° · low 12° · rain from 3pm".
// Hours are Open-Meteo local-time strings ("2026-06-23T15:00"); `nowKey` is the
// current Ludlow hour as "YYYY-MM-DDTHH", so plain string compares work.

const LIKELY = 50; // % — rain we'd actually mention
const CLEARS = 30; // % — rain counts as over once it drops under this
const DRY = 20;    // % — every remaining hour under this reads as "staying dry"

export interface TodayOutlook {
  high: number;
  low: number;
  rain: string | null;
}

export function hourLabel(iso: string): string {
  const h = parseInt(iso.slice(11, 13), 10);
  if (h === 0) return "12am";
  if (h < 12) return `${h}am`;
  if (h === 12) return "12pm";
  return `${h - 12}pm`;
}

export function londonHourKey(at: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/London",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", hourCycle: "h23",
  }).formatToParts(at);
  const g = (t: string) => parts.find((x) => x.type === t)?.value ?? "00";
  return `${g("year")}-${g("month")}-${g("day")}T${g("hour")}`;
}

export function rainOutlook(hourly: HourlyForecast[], nowKey: string): string | null {
  const day = nowKey.slice(0, 10);
  const rest = hourly.filter((h) => h.time.slice(0, 10) === day && h.time.slice(0, 13) >= nowKey);
  if (rest.length === 0) return null;

  if (rest[0].precipProbability >= LIKELY) {
    const clears = rest.find((h) => h.precipProbability < CLEARS);
    return clears ? `rain until ${hourLabel(clears.time)}` : "rain for the rest of the day";
  }
  const next = rest.find((h) => h.precipProbability >= LIKELY);
  if (next) return `rain likely from ${hourLabel(next.time)}`;
  if (rest.every((h) => h.precipProbability < DRY)) return "staying dry";
  return null;
}

export function todayOutlook(
  today: DailyForecast,
  hourly: HourlyForecast[] | undefined,
  nowKey: string,
): TodayOutlook {
  return {
    high: Math.round(today.tempMax),
    low: Math.round(today.tempMin),
    rain: hourly?.length ? rainOutlook(hourly, nowKey) : null,
  };
}
