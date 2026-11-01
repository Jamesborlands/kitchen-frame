"use client";
import useSWR from "swr";
import { getJson } from "@/lib/hooks/getJson";
import { type Warning } from "@/lib/sources/warnings";
import { REFRESH } from "@/lib/config";

export function useWarnings() {
  const { data } = useSWR<Warning[]>(
    "warnings",
    () => getJson<Warning[]>("/api/warnings"),
    { refreshInterval: REFRESH.dataMs, keepPreviousData: true, revalidateOnFocus: false },
  );
  return { warnings: data };
}
