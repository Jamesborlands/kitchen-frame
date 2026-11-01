import type { DailyForecast } from "@/lib/sources/weather";
import { describeWeather } from "@/lib/weather/codes";

export interface RideDay {
  date: string;
  weekday: string;
  tempMax: number;
  precip: number;
  score: number;
  verdict: "great" | "good" | "ok" | "poor";
}

const ADVERSE_WATERCOLORS = new Set(["rain", "snow", "storm", "fog"]);

export function rateRideDay(day: DailyForecast): RideDay {
  let score = 100;

  // Precipitation penalty: up to 60 points for wet conditions
  score -= Math.min(60, day.precipitationSum * 9);

  // Temperature penalty: mild ~18°C is ideal
  score -= Math.abs(day.tempMax - 18) * 1.6;

  // Adverse weather code penalty
  const { watercolor } = describeWeather(day.weatherCode);
  if (ADVERSE_WATERCOLORS.has(watercolor)) {
    score -= 18;
  }

  // Clamp to 0..100
  const clamped = Math.round(Math.max(0, Math.min(100, score)));

  const verdict: RideDay["verdict"] =
    clamped >= 75 ? "great"
    : clamped >= 55 ? "good"
    : clamped >= 35 ? "ok"
    : "poor";

  // Weekday in Europe/London timezone (short)
  const weekday = new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    timeZone: "Europe/London",
  }).format(new Date(`${day.date}T12:00:00Z`));

  return {
    date: day.date,
    weekday,
    tempMax: day.tempMax,
    precip: day.precipitationSum,
    score: clamped,
    verdict,
  };
}

export function rateRideDays(daily: DailyForecast[]): RideDay[] {
  return daily.map(rateRideDay);
}

export function bestRideDay(daily: DailyForecast[]): RideDay | undefined {
  if (daily.length === 0) return undefined;
  const rated = rateRideDays(daily);
  return rated.reduce((best, day) =>
    day.score > best.score ? day : best
  );
}
