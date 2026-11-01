"use client";
import { useState } from "react";
import type { FramePhoto, ItemKind } from "@/lib/frame/store";
import { HoldButton } from "@/components/HoldButton";
import { when } from "@/app/family/format";
import { ActionButton, Button, fieldClass } from "@/app/family/ui";

const PAGE = 60; // every photo is kept, so show them a page at a time
import type { ItemAction } from "@/app/family/FamilyView";

export function PhotosTab({
  photos, names = [], onItem,
}: { photos: FramePhoto[]; names?: string[]; onItem: (a: ItemAction, k: ItemKind, id: string, from?: string) => Promise<void> }) {
  const [shown, setShown] = useState(PAGE);
  if (!photos.length) {
    return <p className="text-muted">No photos yet. Photos sent to the frame&apos;s WhatsApp number appear here.</p>;
  }
  return (
    <>
      <p className="pb-3 text-base text-muted">
        {photos.length} photo{photos.length === 1 ? "" : "s"}. &ldquo;Hide&rdquo; takes a photo off the frame but keeps it here;
        &ldquo;Delete&rdquo; moves it to the bin for 30 days.
      </p>
      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {photos.slice(0, shown).map((p) => (
          <li key={p.id} className="overflow-hidden rounded-2xl border border-divider bg-card">
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.url}
                alt={p.caption ?? `photo from ${p.from}`}
                loading="lazy"
                className={`aspect-[4/3] w-full object-cover ${p.hidden ? "opacity-40 grayscale" : ""}`}
              />
              {p.hidden && (
                <span className="absolute left-3 top-3 rounded-full bg-ink/80 px-3 py-1 text-sm text-paper">not on the frame</span>
              )}
            </div>
            <div className="space-y-3 p-4">
              <div>
                <p className="text-base">{p.from.trim() ? <>from {p.from} · </> : null}<span className="text-muted">{when(p.at)}</span></p>
                {p.caption && <p className="text-base text-muted">{p.caption}</p>}
              </div>
              {!p.from.trim() && <WhoSent names={names} onSave={(name) => onItem("setFrom", "photo", p.id, name)} />}
              <div className="flex flex-wrap items-start gap-2">
                {p.hidden ? (
                  <ActionButton run={() => onItem("show", "photo", p.id)}>Show on frame</ActionButton>
                ) : (
                  <ActionButton run={() => onItem("hide", "photo", p.id)}>Hide from frame</ActionButton>
                )}
                <HoldButton onConfirm={() => onItem("delete", "photo", p.id)}>Hold to delete</HoldButton>
              </div>
            </div>
          </li>
        ))}
      </ul>
      {photos.length > shown && (
        <div className="pt-4 text-center">
          <Button onClick={() => setShown((n) => n + PAGE)}>Show older photos ({photos.length - shown} more)</Button>
        </div>
      )}
    </>
  );
}

/** For a photo whose sender is unknown (e.g. from before the move): name them so the frame shows their initials. */
function WhoSent({ names, onSave }: { names: string[]; onSave: (name: string) => Promise<void> }) {
  const [name, setName] = useState("");
  return (
    <div className="space-y-2">
    {names.length > 0 && (
      <div className="flex flex-wrap gap-2" aria-label="family names">
        {names.map((n) => <ActionButton key={n} run={() => onSave(n)}>{n}</ActionButton>)}
      </div>
    )}
    <div className="flex items-end gap-2">
      <label className="flex-1 text-base">Who sent this?
        <input className={fieldClass} value={name} placeholder="e.g. Kate" onChange={(e) => setName(e.target.value)} />
      </label>
      <ActionButton run={() => onSave(name.trim())} disabled={!name.trim()}>Save</ActionButton>
    </div>
    </div>
  );
}

