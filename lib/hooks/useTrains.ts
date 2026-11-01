"use client";
import useSWR from "swr";
import { type TrainBoard } from "@/lib/sources/trains";

export function useTrains() {
  const { data, error, isLoading } = useSWR<TrainBoard>(
    "trains",
    () =>
      fetch("/api/trains").then((r) => {
        if (!r.ok) return { services: [], messages: [] } as TrainBoard;
        return r.json() as Promise<TrainBoard>;
      }),
    { refreshInterval: 120_000, keepPreviousData: true, revalidateOnFocus: false },
  );
  return { data, error, isLoading };
}
