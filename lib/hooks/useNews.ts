"use client";
import useSWR from "swr";
import { getJson } from "@/lib/hooks/getJson";
import { type NewsItem } from "@/lib/sources/news";
import { REFRESH } from "@/lib/config";

export function useNews() {
  const { data, error, isLoading } = useSWR<NewsItem[]>(
    "news",
    () => getJson<NewsItem[]>("/api/news"),
    { refreshInterval: REFRESH.dataMs, keepPreviousData: true, revalidateOnFocus: false },
  );
  return { items: data, error, isLoading };
}
