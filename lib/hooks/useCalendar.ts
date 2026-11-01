"use client";
import useSWR from "swr";
import { getJson } from "@/lib/hooks/getJson";
import { type CalEvent } from "@/lib/sources/calendar";
import { REFRESH } from "@/lib/config";

export function useCalendar() {
  const { data } = useSWR<CalEvent[]>(
    "calendar",
    () => getJson<CalEvent[]>("/api/calendar"),
    { refreshInterval: REFRESH.dataMs, keepPreviousData: true, revalidateOnFocus: false },
  );
  return { events: data };
}
