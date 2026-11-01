// Weather for the family places, shared by the feed and the panels so they don't
// each call Open-Meteo: kept per isolate for REFRESH.dataMs, last good on failure.
import { REFRESH } from "@/lib/config";
import type { Loc } from "@/lib/kitchen/feed/sections";
import { fetchWeather, type WeatherData } from "@/lib/sources/weather";
import { lastGood, type LastGood } from "@/lib/kitchen/feed/lastGood";

const cache = lastGood<WeatherData>(REFRESH.dataMs);

export function familyWeather(loc: Loc, now: number): Promise<LastGood<WeatherData> | null> {
  // keyed by where, not by name: every household's home is called "home"
  return cache(`${loc.latitude.toFixed(3)},${loc.longitude.toFixed(3)}`, now, () => fetchWeather(loc.latitude, loc.longitude, loc.timezone));
}
