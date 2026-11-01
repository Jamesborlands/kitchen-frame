"use client";
import { TRASH_KEEP_MS, type ItemKind, type TrashItem } from "@/lib/frame/store";
import { when } from "@/app/family/format";
import { ActionButton } from "@/app/family/ui";
import type { ItemAction } from "@/app/family/FamilyView";

const DAY = 86_400_000;

export function BinTab({
  trash, onItem, now,
}: { trash: TrashItem[]; onItem: (a: ItemAction, k: ItemKind, id: string) => Promise<void>; now: number }) {
  if (!trash.length) return <p className="text-muted">The bin is empty. Deleted photos and messages wait here for 30 days.</p>;
  return (
    <>
      <p className="pb-3 text-base text-muted">Deleted things wait here for 30 days, then they&apos;re gone for good.</p>
      <ul className="divide-y divide-divider rounded-2xl border border-divider bg-card">
        {trash.map((t) => {
          const daysLeft = Math.max(0, Math.ceil((t.deletedAt + TRASH_KEEP_MS - now) / DAY));
          return (
            <li key={`${t.kind}-${t.item.id}`} className="flex flex-wrap items-center gap-3 p-3">
              {t.kind === "photo" ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={t.item.url} alt="" loading="lazy" className="h-16 w-16 shrink-0 rounded-lg object-cover" />
              ) : (
                <span className="min-w-0 flex-1">&ldquo;{t.item.text}&rdquo;</span>
              )}
              <span className={`text-base text-muted ${t.kind === "photo" ? "flex-1" : ""}`}>
                from {t.item.from} · sent {when(t.item.at)} · {daysLeft} day{daysLeft === 1 ? "" : "s"} left
              </span>
              <ActionButton run={() => onItem("restore", t.kind, t.item.id)}>Put back</ActionButton>
            </li>
          );
        })}
      </ul>
    </>
  );
}
