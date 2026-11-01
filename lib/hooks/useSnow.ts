"use client";
import useSWR from "swr";
import { fetchSnow, type SnowConditions } from "@/lib/sources/snow";
import { REFRESH } from "@/lib/config";

interface SnowLoc {
  latitude: number;
  longitude: number;
  timezone: string;
}

export function useSnow(loc: SnowLoc) {
  const { data, error, isLoading } = useSWR<SnowConditions>(
    ["snow", loc.latitude, loc.longitude, loc.timezone],
    () => fetchSnow(loc.latitude, loc.longitude, loc.timezone),
    { refreshInterval: REFRESH.dataMs, keepPreviousData: true, revalidateOnFocus: false },
  );
  return { data, error, isLoading };
}
