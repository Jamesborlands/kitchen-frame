"use client";
import useSWR from "swr";
import { getJson } from "@/lib/hooks/getJson";
import { type FloodWarning, type RiverLevel } from "@/lib/sources/flood";
import { REFRESH } from "@/lib/config";

export interface FloodData {
  warnings: FloodWarning[];
  rivers: RiverLevel[];
}

export function useFlood() {
  const { data, error, isLoading } = useSWR<FloodData>(
    "flood",
    () => getJson<FloodData>("/api/flood"),
    { refreshInterval: REFRESH.dataMs, keepPreviousData: true, revalidateOnFocus: false },
  );
  return { data, error, isLoading };
}
