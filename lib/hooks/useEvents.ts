"use client";
import useSWR from "swr";
import { getJson } from "@/lib/hooks/getJson";
import { type EventItem } from "@/lib/sources/events";
import { REFRESH } from "@/lib/config";

export function useEvents() {
  const { data, error, isLoading } = useSWR<EventItem[]>(
    "events",
    () => getJson<EventItem[]>("/api/events"),
    { refreshInterval: REFRESH.dataMs, keepPreviousData: true, revalidateOnFocus: false },
  );
  return { items: data, error, isLoading };
}
