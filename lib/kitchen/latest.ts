// A short marker of what's on the frame: it changes the moment a photo or message
// arrives (or goes). The feed carries it; the frame checks /api/kitchen/latest every
// 10 seconds and fetches the full feed only when the two differ.
import type { Frame } from "@/lib/frame/store";

export function latestMarker(frame: Frame): string {
  return `${frame.photos[0]?.id ?? ""}|${frame.notes[0]?.id ?? ""}|${frame.photos.length}|${frame.notes.length}`;
}
