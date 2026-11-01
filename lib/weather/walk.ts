import { type HourlyForecast, type DailyForecast } from "@/lib/sources/weather";
import { describeWeather } from "@/lib/weather/codes";

// Picks the nicest window for a dog walk today from the hourly forecast —
// daylight, dry, and a comfortable temperature.

export interface WalkWindow {
  start: string; // ISO hour the window starts
  end: string; // ISO hour the window ends (exclusive-ish, start of last hour + 1)
  tone: "good" | "okay" | "grim";
  summary: string; // "dry & 19°"
}

const IDEAL_TEMP = 16;

const HOT = 27; // °C — hot pavement / heatstroke risk for a dog

export function hourScore(h: HourlyForecast): number {
  let s = 100 - h.precipProbability;
  const sky = describeWeather(h.weatherCode).watercolor;
  if (sky === "storm") s -= 60;
  else if (sky === "snow") s -= 35;
  else if (sky === "rain") s -= 25;
  else if (sky === "fog") s -= 10;
  s -= Math.min(45, Math.abs(h.temp - IDEAL_TEMP) * 2.5);
  if (h.temp >= HOT) s -= 25; // too hot for paws
  return s;
}

function hourOf(iso: string): number {
  return parseInt(iso.slice(11, 13), 10);
}

function plusOneHour(iso: string): string {
  const h = hourOf(iso);
  const next = (h + 1).toString().padStart(2, "0");
  return `${iso.slice(0, 11)}${next}:00`;
}

/**
 * @param hourly  the hourly forecast (local Ludlow time strings)
 * @param today   today's daily forecast (for sunrise/sunset)
 * @param nowKey  current Ludlow hour as "YYYY-MM-DDTHH" (so past hours are skipped)
 */
export function bestWalkWindow(
  hourly: HourlyForecast[],
  today: DailyForecast,
  nowKey: string,
): WalkWindow | null {
  const sunriseH = hourOf(today.sunrise);
  const sunsetH = hourOf(today.sunset);

  const candidates = hourly.filter((h) => {
    if (h.time.slice(0, 10) !== today.date) return false;
    if (h.time.slice(0, 13) < nowKey) return false;
    const hh = hourOf(h.time);
    return hh >= sunriseH && hh <= sunsetH;
  });
  if (candidates.length === 0) return null;

  let best: HourlyForecast[] = candidates.length === 1 ? candidates : [];
  let bestScore = candidates.length === 1 ? hourScore(candidates[0]) : -Infinity;
  // prefer a full 2-hour window
  for (let i = 0; i + 2 <= candidates.length; i++) {
    const win = candidates.slice(i, i + 2);
    const avg = (hourScore(win[0]) + hourScore(win[1])) / 2;
    if (avg > bestScore) {
      bestScore = avg;
      best = win;
    }
  }
  if (best.length === 0) return null;

  const last = best[best.length - 1];
  const avgTemp = Math.round(best.reduce((a, h) => a + h.temp, 0) / best.length);
  const maxPrecip = Math.max(...best.map((h) => h.precipProbability));
  const tone: WalkWindow["tone"] = bestScore >= 70 ? "good" : bestScore >= 45 ? "okay" : "grim";
  const wet = maxPrecip >= 40 ? "showers about" : maxPrecip >= 20 ? "maybe a shower" : "dry";
  const summary =
    avgTemp >= HOT ? `hot at ${avgTemp}° — keep it shady & short` : `${wet} & ${avgTemp}°`;

  return {
    start: best[0].time,
    end: plusOneHour(last.time),
    tone,
    summary,
  };
}
