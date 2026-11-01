import { type NoticeCard, type NoticeSource } from "@/lib/notice/card";
import { type GeoLocation } from "@/lib/config";
import { fetchWeather, type DailyForecast } from "@/lib/sources/weather";
import { describeWeather } from "@/lib/weather/codes";

export function notableFromDaily(loc: GeoLocation, today: DailyForecast): NoticeCard | null {
  const sky = describeWeather(today.weatherCode).watercolor;
  const place = loc.label;
  let title: string | null = null;
  if (sky === "snow") title = `snow falling at ${place} today.`;
  else if (sky === "storm") title = `storms over ${place} today.`;
  else if (today.tempMax >= 30) title = `hot in ${place} today — ${Math.round(today.tempMax)}°.`;
  else if (today.tempMax <= -8) title = `bitter cold at ${place} — ${Math.round(today.tempMax)}°.`;
  if (!title) return null;
  return {
    id: `weather-${loc.key}-${today.date}`,
    kind: "weather",
    label: place.toLowerCase(),
    title,
    priority: 70,
  };
}

export const notableWeatherSource: NoticeSource = async (ctx, fetchImpl = fetch) => {
  const results = await Promise.all(
    ctx.locations.map(async (loc) => {
      try {
        const data = await fetchWeather(loc.latitude, loc.longitude, loc.timezone, fetchImpl);
        const today = data.daily[0];
        if (!today) return null;
        return notableFromDaily(loc, today);
      } catch {
        return null;
      }
    }),
  );
  return results.filter((c): c is NoticeCard => c !== null);
};
