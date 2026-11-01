export type WatercolorKey =
  | "clear" | "cloud" | "overcast" | "fog" | "rain" | "snow" | "storm"
  | "golden" | "sunrise" | "sunset" | "twilight" | "night";

export interface WeatherDescriptor {
  label: string;
  watercolor: WatercolorKey;
}

const TABLE: Record<number, WeatherDescriptor> = {
  0: { label: "clear sky", watercolor: "clear" },
  1: { label: "mainly clear", watercolor: "clear" },
  2: { label: "partly cloudy", watercolor: "cloud" },
  3: { label: "overcast", watercolor: "overcast" },
  45: { label: "fog", watercolor: "fog" },
  48: { label: "freezing fog", watercolor: "fog" },
  51: { label: "light drizzle", watercolor: "rain" },
  53: { label: "drizzle", watercolor: "rain" },
  55: { label: "heavy drizzle", watercolor: "rain" },
  56: { label: "freezing drizzle", watercolor: "rain" },
  57: { label: "freezing drizzle", watercolor: "rain" },
  61: { label: "light rain", watercolor: "rain" },
  63: { label: "rain", watercolor: "rain" },
  65: { label: "heavy rain", watercolor: "rain" },
  66: { label: "freezing rain", watercolor: "rain" },
  67: { label: "freezing rain", watercolor: "rain" },
  71: { label: "light snow", watercolor: "snow" },
  73: { label: "snow", watercolor: "snow" },
  75: { label: "heavy snow", watercolor: "snow" },
  77: { label: "snow grains", watercolor: "snow" },
  80: { label: "light showers", watercolor: "rain" },
  81: { label: "showers", watercolor: "rain" },
  82: { label: "heavy showers", watercolor: "rain" },
  85: { label: "snow showers", watercolor: "snow" },
  86: { label: "snow showers", watercolor: "snow" },
  95: { label: "thunderstorm", watercolor: "storm" },
  96: { label: "thunderstorm, hail", watercolor: "storm" },
  99: { label: "thunderstorm, hail", watercolor: "storm" },
};

export function describeWeather(code: number): WeatherDescriptor {
  return TABLE[code] ?? { label: "unsettled", watercolor: "cloud" };
}

const GOLDEN_WINDOW_MINUTES = 40;
// Blue-hour band just outside golden, on the night side of sunrise/sunset.
const TWILIGHT_WINDOW_MINUTES = 35;

export function isGoldenHour(nowMinutes: number, sunriseMinutes: number, sunsetMinutes: number): boolean {
  const nearSunrise = Math.abs(nowMinutes - sunriseMinutes) <= GOLDEN_WINDOW_MINUTES;
  const nearSunset = Math.abs(nowMinutes - sunsetMinutes) <= GOLDEN_WINDOW_MINUTES;
  return nearSunrise || nearSunset;
}

export function isNight(nowMinutes: number, sunriseMinutes: number, sunsetMinutes: number): boolean {
  return nowMinutes < sunriseMinutes || nowMinutes > sunsetMinutes;
}

export type LightPhase = "night" | "twilight" | "sunrise" | "sunset" | "day";

/**
 * Where the day's light is right now, from the clock and today's sun times.
 * Golden hour splits into sunrise vs sunset; the dim band just beyond it (on
 * the night side) is twilight/blue-hour; fully past it is night.
 */
export function lightPhase(
  nowMinutes: number,
  sunriseMinutes: number,
  sunsetMinutes: number,
): LightPhase {
  if (Math.abs(nowMinutes - sunriseMinutes) <= GOLDEN_WINDOW_MINUTES) return "sunrise";
  if (Math.abs(nowMinutes - sunsetMinutes) <= GOLDEN_WINDOW_MINUTES) return "sunset";
  const dawnTwilight =
    nowMinutes < sunriseMinutes &&
    nowMinutes >= sunriseMinutes - GOLDEN_WINDOW_MINUTES - TWILIGHT_WINDOW_MINUTES;
  const duskTwilight =
    nowMinutes > sunsetMinutes &&
    nowMinutes <= sunsetMinutes + GOLDEN_WINDOW_MINUTES + TWILIGHT_WINDOW_MINUTES;
  if (dawnTwilight || duskTwilight) return "twilight";
  if (nowMinutes < sunriseMinutes || nowMinutes > sunsetMinutes) return "night";
  return "day";
}

export function skyKey(code: number, phase: LightPhase = "day"): WatercolorKey {
  const base = describeWeather(code).watercolor;
  if (phase === "night") return "night";
  // Light-of-day scenes only read when the sky is otherwise clear or cloudy;
  // rain/snow/storm/fog keep their own scene even at sunrise or sunset.
  if (
    (phase === "sunrise" || phase === "sunset" || phase === "twilight") &&
    (base === "clear" || base === "cloud")
  ) {
    return phase;
  }
  return base;
}
