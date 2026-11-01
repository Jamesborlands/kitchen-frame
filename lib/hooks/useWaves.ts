"use client";
import useSWR from "swr";
import { getJson } from "@/lib/hooks/getJson";
import type { WaveReading } from "@/lib/sources/waves";
import { REFRESH } from "@/lib/config";

export function useWaves() {
  const { data, error, isLoading } = useSWR<WaveReading>(
    "waves",
    () => getJson<WaveReading>("/api/waves"),
    { refreshInterval: REFRESH.dataMs, keepPreviousData: true, revalidateOnFocus: false },
  );
  return { data, error, isLoading };
}
