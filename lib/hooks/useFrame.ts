"use client";
import useSWR from "swr";
import type { FrameNote } from "@/lib/frame/store";
import type { FramePhotoView } from "@/lib/frame/love";

export interface FrameView {
  photos: FramePhotoView[];
  notes: FrameNote[];
}

const fetcher = (url: string): Promise<FrameView> =>
  fetch(url).then((r) => {
    if (!r.ok) return { photos: [], notes: [] };
    return r.json() as Promise<FrameView>;
  });

export function useFrame(): { data: FrameView | undefined; love: (id: string) => Promise<boolean> } {
  const { data, mutate } = useSWR<FrameView>("frame", () => fetcher("/api/frame"), {
    // 30s: snappy enough that a freshly-sent photo pops up within ~½ minute,
    // while ~2 KV reads per poll keeps the kitchen's 24/7 polling inside the
    // Upstash free tier (~5.8k commands/day on the one always-on screen).
    refreshInterval: 30_000,
    keepPreviousData: true,
  });

  // ❤️ a photo: show it as loved straight away, then confirm with the server.
  const love = async (id: string): Promise<boolean> => {
    const mark = (f: FrameView | undefined) =>
      f && { ...f, photos: f.photos.map((p) => (p.id === id ? { ...p, loved: true, lovable: false } : p)) };
    let ok = false;
    await mutate(
      async (current) => {
        const res = await fetch("/api/frame/love", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id }),
        }).catch(() => null);
        ok = Boolean(res?.ok);
        if (!ok) throw new Error("love failed");
        return mark(current);
      },
      { optimisticData: (current) => mark(current) as FrameView, rollbackOnError: true, revalidate: false },
    ).catch(() => {});
    return ok;
  };

  return { data, love };
}
