"use client";
import useSWR from "swr";
import { getJson } from "@/lib/hooks/getJson";
import { type NoticeCard } from "@/lib/notice/card";
import { REFRESH } from "@/lib/config";

export function useNotice() {
  const { data } = useSWR<NoticeCard[]>(
    "notice",
    () => getJson<NoticeCard[]>("/api/notice"),
    { refreshInterval: REFRESH.dataMs, keepPreviousData: true, revalidateOnFocus: false },
  );
  return { cards: data };
}
