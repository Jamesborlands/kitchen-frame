"use client";
import { useCallback, useState } from "react";

type Status = "loading" | "ok" | "failed";

export function WatercolorScene({
  sceneKey, alt, className = "",
}: { sceneKey: string; alt: string; className?: string }) {
  const [status, setStatus] = useState<Status>("loading");

  // Catch images that finish loading before React attaches onLoad — cached or
  // fast assets complete during SSR hydration, so the load event never reaches
  // the handler and the image would otherwise stay hidden behind the wash.
  const imgRef = useCallback((node: HTMLImageElement | null) => {
    if (node?.complete) {
      setStatus(node.naturalWidth > 0 ? "ok" : "failed");
    }
  }, []);

  return (
    <div className={`relative ${className}`}>
      {/* Wash placeholder: shown while loading or on failure */}
      {status !== "ok" && (
        <div
          data-testid="watercolor-fallback"
          aria-label={alt}
          className="absolute inset-0 rounded-2xl bg-wash/40"
        />
      )}
      {/* Image is always mounted so src/alt are SSR-present and testable.
          Kept opacity-0 until loaded so a broken/missing image never shows
          a broken-image glyph, regardless of when the error event fires. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={imgRef}
        src={`/watercolor/${sceneKey}.webp`}
        alt={alt}
        onLoad={() => setStatus("ok")}
        onError={() => setStatus("failed")}
        className={`block w-full h-full rounded-2xl object-cover transition-opacity duration-500 ${
          status === "ok" ? "opacity-100" : "opacity-0"
        }`}
      />
    </div>
  );
}
