"use client";
import useSWR from "swr";
import { getJson } from "@/lib/hooks/getJson";
import type { TideEvent } from "@/lib/sources/tides";
import { REFRESH } from "@/lib/config";

export function useTides() {
  const { data, error, isLoading } = useSWR<TideEvent[]>(
    "tides",
    () => getJson<TideEvent[]>("/api/tides"),
    { refreshInterval: REFRESH.dataMs, keepPreviousData: true, revalidateOnFocus: false },
  );
  return { events: data, error, isLoading };
}
