"use client";
import useSWR from "swr";
import { fetchWildlife, type Sighting } from "@/lib/sources/wildlife";

export function useWildlife() {
  const { data, error, isLoading } = useSWR<Sighting[]>(
    ["wildlife"],
    () => fetchWildlife(52.3675, -2.7181, 12),
    { revalidateOnFocus: false, dedupingInterval: 600000 },
  );
  return { data, error, isLoading };
}
