"use client";
import useSWR from "swr";
import { fetchWeather, type WeatherData } from "@/lib/sources/weather";
import { REFRESH } from "@/lib/config";

interface Coords { latitude: number; longitude: number; timezone: string }

// fetchedAt lets the kitchen say "updated 2h ago" when it's showing old data.
export type TimedWeather = WeatherData & { fetchedAt: number };

export function useWeather(loc: Coords) {
  const { data, error, isLoading } = useSWR<TimedWeather>(
    ["weather", loc.latitude, loc.longitude, loc.timezone],
    async () => ({
      ...(await fetchWeather(loc.latitude, loc.longitude, loc.timezone)),
      fetchedAt: Date.now(),
    }),
    { refreshInterval: REFRESH.dataMs, keepPreviousData: true, revalidateOnFocus: false },
  );
  return { data, error, isLoading };
}
