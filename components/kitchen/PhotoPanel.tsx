"use client";
import { useRef, useState } from "react";
import { useFrame } from "@/lib/hooks/useFrame";
import { PhotoSlide, relativeTime } from "@/components/PhotoFrame";

const SWIPE_PX = 60;

// One photo, big, with who sent it and when. Swipe or use the arrows to browse;
// ❤️ sends a heart reaction to the sender's WhatsApp message (see lib/frame/love).
export function PhotoPanel({ startIndex }: { startIndex: number }) {
  const { data, love } = useFrame();
  const photos = data?.photos ?? [];
  const [index, setIndex] = useState(startIndex);
  const [failed, setFailed] = useState<string | null>(null);
  const swipeStart = useRef<number | null>(null);

  if (photos.length === 0) return <p className="pt-4 text-muted">no photos yet.</p>;
  const i = Math.min(index, photos.length - 1);
  const photo = photos[i];
  const go = (delta: number) => {
    setFailed(null);
    setIndex((i + delta + photos.length) % photos.length);
  };

  const onLove = async () => {
    setFailed(null);
    if (!(await love(photo.id))) setFailed(photo.id);
  };

  const arrow = "flex size-14 shrink-0 items-center justify-center rounded-full border border-divider bg-card text-2xl text-muted active:bg-divider disabled:opacity-30";

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex min-h-0 flex-1 items-center gap-4">
        <button type="button" aria-label="previous photo" className={arrow} disabled={photos.length < 2} onClick={() => go(-1)}>
          ‹
        </button>
        <div
          className="h-full min-h-[24rem] flex-1 select-none"
          style={{ touchAction: "pan-y" }}
          onPointerDown={(e) => {
            swipeStart.current = e.clientX;
          }}
          onPointerUp={(e) => {
            if (swipeStart.current === null) return;
            const dx = e.clientX - swipeStart.current;
            swipeStart.current = null;
            if (Math.abs(dx) >= SWIPE_PX) go(dx < 0 ? 1 : -1);
          }}
        >
          <PhotoSlide photo={photo} fill />
        </div>
        <button type="button" aria-label="next photo" className={arrow} disabled={photos.length < 2} onClick={() => go(1)}>
          ›
        </button>
      </div>

      <div className="flex shrink-0 items-center justify-between gap-4 px-18">
        <p className="text-lg">
          from <span className="font-[family-name:var(--font-cormorant)] text-2xl">{photo.from}</span>
          <span className="text-muted"> · {relativeTime(photo.at)} · {i + 1} of {photos.length}</span>
        </p>
        {photo.loved ? (
          <p className="text-lg text-muted">❤️ sent to {photo.from}</p>
        ) : photo.lovable ? (
          <button
            type="button"
            onClick={onLove}
            className="flex items-center gap-2 rounded-full border border-divider bg-card px-6 py-3 text-lg active:bg-divider"
          >
            <span aria-hidden>❤️</span> send a heart
          </button>
        ) : null}
      </div>
      {failed === photo.id && (
        <p className="shrink-0 text-center text-sm text-muted">couldn&apos;t send the heart just now — try again in a bit.</p>
      )}
    </div>
  );
}
