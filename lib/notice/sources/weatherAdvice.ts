import { type NoticeCard, type NoticeSource } from "@/lib/notice/card";
import { HOME } from "@/lib/config";
import { fetchWeather, type DailyForecast, type HourlyForecast } from "@/lib/sources/weather";

// Practical weather for home, the way you'd say it in the kitchen: rain coming
// later ("take a coat"), rain now with a drier spell, or a frost tonight.
// Hourly times come from Open-Meteo in local wall-clock time ("2026-10-12T15:00"),
// so `now` is the same local form and plain string comparison orders them.

const WET = 60; // % chance of rain that counts as "rain likely"
const DRY = 40;
const LAST_HOUR = 21; // nobody's heading out after 9pm

function hourLabel(h: number): string {
  if (h === 0) return "midnight";
  if (h === 12) return "midday";
  return h < 12 ? `${h}am` : `${h - 12}pm`;
}

const hourOf = (t: string) => Number(t.slice(11, 13));

export function weatherAdvice(hourly: HourlyForecast[], daily: DailyForecast[], nowLocal: string): NoticeCard[] {
  const today = nowLocal.slice(0, 10);
  const nowHour = hourOf(nowLocal);
  const label = HOME.label.toLowerCase();
  const cards: NoticeCard[] = [];

  if (nowHour < LAST_HOUR) {
    const rest = hourly.filter((h) => h.time.slice(0, 10) === today && hourOf(h.time) >= nowHour && hourOf(h.time) < LAST_HOUR);
    const wetNow = rest[0] && rest[0].time.slice(0, 13) === nowLocal.slice(0, 13) && rest[0].precipProbability >= WET;
    let title: string | null = null;
    if (wetNow) {
      const dry = rest.find((h) => h.precipProbability < DRY);
      title = dry ? `Rain about now — drier from ${hourLabel(hourOf(dry.time))}.` : "Rain on and off for the rest of the day.";
    } else {
      const wet = rest.find((h) => h.precipProbability >= WET);
      if (wet) title = `Rain likely from ${hourLabel(hourOf(wet.time))} — take a coat if you're heading out.`;
    }
    if (title) cards.push({ id: `advice-rain-${today}-${title}`, kind: "weather", label, title, priority: 72 });
  }

  // tonight's low is tomorrow's daily minimum (it falls before dawn)
  const tomorrow = daily.find((d) => d.date > today);
  if (nowHour >= 12 && tomorrow && tomorrow.tempMin <= 0) {
    cards.push({ id: `advice-frost-${today}`, kind: "weather", label, title: `Frost tonight — down to ${Math.round(tomorrow.tempMin)}°.`, priority: 71 });
  }
  return cards;
}

function localNow(tz: string, now: Date): string {
  const p = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(now);
  const g = (t: string) => p.find((x) => x.type === t)?.value ?? "00";
  return `${g("year")}-${g("month")}-${g("day")}T${g("hour")}:${g("minute")}`;
}

export const weatherAdviceSource: NoticeSource = async (ctx, fetchImpl = fetch) => {
  try {
    const w = await fetchWeather(HOME.latitude, HOME.longitude, HOME.timezone, fetchImpl);
    return weatherAdvice(w.hourly, w.daily, localNow(HOME.timezone, ctx.now));
  } catch {
    return [];
  }
};
