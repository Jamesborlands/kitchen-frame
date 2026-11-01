"use client";

import { useEffect, useRef, useState } from "react";
import { useFrame } from "@/lib/hooks/useFrame";
import { FamilyMessageBoard } from "@/components/FamilyMessageBoard";
import { initials } from "@/lib/initials";
import type { FrameNote } from "@/lib/frame/store";
import type { FramePhotoView } from "@/lib/frame/love";

export function relativeTime(at: number): string {
  const diff = Date.now() - at;
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function NoteCard({ note }: { note: FrameNote }) {
  return (
    <div
      style={{
        background: "var(--color-card)",
        border: "1px solid var(--color-divider)",
        borderRadius: "0.75rem",
        padding: "0.75rem 1rem",
        display: "flex",
        flexDirection: "column",
        gap: "0.25rem",
      }}
    >
      <p style={{ color: "var(--color-ink)", fontSize: "0.95rem", margin: 0 }}>
        {note.text}
      </p>
      <span style={{ color: "var(--color-muted)", fontSize: "0.75rem" }}>
        {note.from} · {relativeTime(note.at)}
      </span>
    </div>
  );
}


export function PhotoSlide({ photo, fill }: { photo: FramePhotoView; fill?: boolean }) {
  const src = photo.url;
  return (
    <div
      style={
        fill
          ? { position: "relative", width: "100%", height: "100%", borderRadius: "1rem", overflow: "hidden" }
          : { position: "relative", width: "100%", paddingBottom: "56.25%", borderRadius: "1rem", overflow: "hidden" }
      }
    >
      {/* Blurred enlargement fills the frame so portrait & landscape photos
          never leave dead bars — the full, uncropped photo sits sharp on top. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          transform: "scale(1.2)",
          filter: "blur(28px) brightness(0.9)",
        }}
      />
      {/* The whole photo, never cropped. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={photo.caption ?? `photo from ${photo.from}`}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "contain",
        }}
      />
      {/* sender initials, top-right */}
      <div
        title={photo.from}
        style={{
          position: "absolute",
          top: "0.7rem",
          right: "0.7rem",
          width: "2rem",
          height: "2rem",
          borderRadius: "9999px",
          background: "color-mix(in srgb, var(--color-ink) 50%, transparent)",
          color: "color-mix(in srgb, var(--color-paper) 96%, transparent)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "0.7rem",
          fontWeight: 500,
          letterSpacing: "0.03em",
          backdropFilter: "blur(3px)",
        }}
      >
        {initials(photo.from)}
      </div>
      {/* Only the photo's caption sits at the bottom now — the sender is shown
          by the initials badge top-right, so no full name strip. */}
      {photo.caption && (
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            padding: "0.75rem 1rem",
            background:
              "linear-gradient(to top, color-mix(in srgb, var(--color-ink) 55%, transparent), transparent)",
            borderRadius: "0 0 1rem 1rem",
          }}
        >
          <span
            style={{
              color: "color-mix(in srgb, var(--color-paper) 92%, transparent)",
              fontSize: "0.95rem",
              fontFamily: "var(--font-cormorant), Georgia, serif",
              fontStyle: "italic",
            }}
          >
            {photo.caption}
          </span>
        </div>
      )}
    </div>
  );
}

const SWIPE_PX = 60;
const NO_PHOTOS: FramePhotoView[] = [];

export function PhotoFrame({
  fill = false,
  className = "",
  onOpenPhoto,
  onOpenNotes,
}: {
  fill?: boolean;
  className?: string;
  // Kitchen touch screen: tap the photo / board to open them in a panel.
  onOpenPhoto?: (index: number) => void;
  onOpenNotes?: () => void;
}) {
  const { data } = useFrame();
  const photos = data?.photos ?? NO_PHOTOS;
  const notes = data?.notes ?? [];

  const [currentIndex, setCurrentIndex] = useState(0);
  const [visible, setVisible] = useState(true);
  const [swipes, setSwipes] = useState(0); // a swipe restarts the slideshow timer
  const swipeStart = useRef<number | null>(null);

  // keep the latest index readable inside the interval without re-arming it
  const indexRef = useRef(0);
  const photosRef = useRef(photos);
  useEffect(() => {
    indexRef.current = currentIndex;
    photosRef.current = photos;
  }, [currentIndex, photos]);

  const SLIDE_MS = 20_000; // how long each photo shows before crossfading
  const FADE_MS = 600;

  // Crossfade slideshow. The next image is preloaded *and decoded* before we
  // swap it in, so the fade-in lands on the new photo instead of lingering on
  // the old bitmap and then popping once the browser finishes decoding.
  useEffect(() => {
    if (photos.length <= 1) return;
    let cancelled = false;
    let fadeTimeout: ReturnType<typeof setTimeout> | null = null;
    const timer = setInterval(() => {
      const list = photosRef.current;
      const next = (indexRef.current + 1) % list.length;
      const pre = new Image();
      pre.src = list[next].url;
      setVisible(false); // begin fading the current photo out
      Promise.all([
        pre.decode().catch(() => {}),
        new Promise<void>((resolve) => {
          fadeTimeout = setTimeout(resolve, FADE_MS);
        }),
      ]).then(() => {
        if (cancelled) return;
        setCurrentIndex(next);
        setVisible(true);
      });
    }, SLIDE_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
      if (fadeTimeout !== null) clearTimeout(fadeTimeout);
    };
  }, [photos.length, swipes]);

  // Swipe left/right steps through the photos; a plain tap opens the panel.
  const step = (delta: number) => {
    if (photos.length <= 1) return;
    const next = (indexRef.current + delta + photos.length) % photos.length;
    setVisible(false);
    setTimeout(() => {
      setCurrentIndex(next);
      setVisible(true);
    }, 200);
    setSwipes((n) => n + 1);
  };
  const touchHandlers = onOpenPhoto && {
    onPointerDown: (e: { clientX: number }) => {
      swipeStart.current = e.clientX;
    },
    onPointerUp: (e: { clientX: number }) => {
      if (swipeStart.current === null) return;
      const dx = e.clientX - swipeStart.current;
      swipeStart.current = null;
      if (Math.abs(dx) >= SWIPE_PX) step(dx < 0 ? 1 : -1);
      else if (photos.length > 0) onOpenPhoto(indexRef.current);
    },
  };

  // When a brand-new photo arrives (newest id changes), jump straight to it so
  // a freshly-sent photo pops up immediately rather than waiting its turn.
  const newestId = photos[0]?.id;
  const [shownNewest, setShownNewest] = useState(newestId);
  if (newestId !== shownNewest) {
    setShownNewest(newestId);
    setCurrentIndex(0);
    setVisible(true);
  }

  const currentPhoto = photos[currentIndex] ?? photos[0] ?? null;

  // fill mode: section fills its container (flex/grid cell), photo grows, notes sit at bottom
  if (fill) {
    return (
      <section
        aria-label="family photo frame"
        className={className}
        style={{
          display: "flex",
          flexDirection: "column",
          height: "100%",
          overflow: "hidden",
        }}
      >
        <p className="section-label" style={{ marginBottom: "0.5rem", flexShrink: 0 }}>
          from the family
        </p>

        {/* Photo — grows to fill */}
        <div
          data-testid="photo-frame-photo"
          {...touchHandlers}
          style={{
            flex: 1,
            minHeight: 0,
            position: "relative",
            opacity: visible ? 1 : 0,
            transition: "opacity 0.6s ease",
            borderRadius: "1rem",
            overflow: "hidden",
            ...(onOpenPhoto && { touchAction: "pan-y", cursor: "pointer", userSelect: "none" }),
          }}
        >
          {currentPhoto ? (
            <PhotoSlide photo={currentPhoto} fill />
          ) : (
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "var(--color-card)",
                border: "1px solid var(--color-divider)",
                borderRadius: "1rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "2rem",
                textAlign: "center",
              }}
            >
              <p
                style={{
                  color: "var(--color-muted)",
                  fontFamily: "var(--font-cormorant), Georgia, serif",
                  fontSize: "1.1rem",
                  fontStyle: "italic",
                  margin: 0,
                }}
              >
                no photos yet — WhatsApp one to the family number
              </p>
            </div>
          )}
        </div>

        {/* Message board — only shown when the family has actually sent a note;
            an empty flip board just reads as broken, so it stays hidden when quiet */}
        {notes.length > 0 && (
          <div
            style={{ flexShrink: 0, marginTop: "0.6rem", ...(onOpenNotes && { cursor: "pointer" }) }}
            {...(onOpenNotes && {
              role: "button",
              "aria-label": "show all messages",
              onClick: onOpenNotes,
            })}
          >
            {/* max-w-none so the board fills the photo column instead of
                capping at max-w-3xl and looking narrow on wide tablets */}
            <FamilyMessageBoard rowCount={2} cols={18} className="max-w-none" />
          </div>
        )}
      </section>
    );
  }

  return (
    <section
      aria-label="family photo frame"
      className={className}
      style={{ marginBottom: "2.5rem" }}
    >
      <p className="section-label" style={{ marginBottom: "1rem" }}>
        from the family
      </p>

      {/* Photo slideshow */}
      {currentPhoto ? (
        <div
          style={{
            opacity: visible ? 1 : 0,
            transition: "opacity 0.6s ease",
            marginBottom: "1.25rem",
          }}
        >
          <PhotoSlide photo={currentPhoto} />
        </div>
      ) : (
        <div
          style={{
            background: "var(--color-card)",
            border: "1px solid var(--color-divider)",
            borderRadius: "1rem",
            padding: "3rem 2rem",
            textAlign: "center",
            marginBottom: "1.25rem",
          }}
        >
          <p
            style={{
              color: "var(--color-muted)",
              fontFamily: "var(--font-cormorant), Georgia, serif",
              fontSize: "1.1rem",
              fontStyle: "italic",
              margin: 0,
            }}
          >
            no photos yet — WhatsApp one to the family number
          </p>
        </div>
      )}

      {/* Dot indicators */}
      {photos.length > 1 && (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: "0.4rem",
            marginBottom: "1.25rem",
          }}
        >
          {photos.map((_, i) => (
            <span
              key={i}
              style={{
                width: i === currentIndex ? "1.5rem" : "0.4rem",
                height: "0.4rem",
                borderRadius: "9999px",
                background:
                  i === currentIndex
                    ? "var(--color-muted)"
                    : "var(--color-divider)",
                transition: "all 0.3s ease",
                display: "inline-block",
              }}
            />
          ))}
        </div>
      )}

      {/* Notes strip */}
      {notes.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {notes.map((note) => (
            <NoteCard key={note.id} note={note} />
          ))}
        </div>
      )}
    </section>
  );
}
