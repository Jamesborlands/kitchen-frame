"use client";
import type { FrameNote, ItemKind, LogEntry } from "@/lib/frame/store";
import { HoldButton } from "@/components/HoldButton";
import { when } from "@/app/family/format";
import { Card } from "@/app/family/ui";
import type { ItemAction } from "@/app/family/FamilyView";

export function MessagesTab({
  log, notes, onItem,
}: { log: LogEntry[]; notes: FrameNote[]; onItem: (a: ItemAction, k: ItemKind, id: string) => Promise<void> }) {
  return (
    <div className="space-y-6">
      <Card>
        <h2 className="pb-1 text-xl">On the flip board now</h2>
        <p className="pb-3 text-base text-muted">Messages stay on the board for a day.</p>
        {notes.length === 0 ? (
          <p className="text-base text-muted">Nothing right now.</p>
        ) : (
          <ul className="space-y-3">
            {notes.map((n) => (
              <li key={n.id} className="flex flex-wrap items-center justify-between gap-2">
                <span>&ldquo;{n.text}&rdquo; <span className="text-base text-muted">— {n.from}, {when(n.at)}</span></span>
                <HoldButton onConfirm={() => onItem("delete", "note", n.id)}>Hold to remove</HoldButton>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <section>
        <h2 className="pb-1 text-xl">Who sent what</h2>
        <p className="pb-3 text-base text-muted">Everything sent to the frame, newest first.</p>
        {log.length === 0 ? (
          <p className="text-base text-muted">Nothing yet.</p>
        ) : (
          <ul aria-label="who sent what" className="divide-y divide-divider rounded-2xl border border-divider bg-card">
            {log.map((e) => (
              <li key={`${e.kind}-${e.id}`} className="flex items-center gap-3 p-3">
                {e.kind === "photo" && e.url && !e.deleted ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={e.url} alt="" loading="lazy" className="h-14 w-14 shrink-0 rounded-lg object-cover" />
                ) : (
                  <span aria-hidden className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-paper text-2xl">✉</span>
                )}
                <div className="min-w-0">
                  <p className="text-base">
                    <strong className="font-normal">{e.from}</strong>{" "}
                    <span className="text-muted">sent {e.kind === "photo" ? "a photo" : "a message"} · {when(e.at)}</span>
                  </p>
                  {e.deleted && <p className="text-base italic text-muted">(deleted)</p>}
                  {e.text && <p className="truncate text-base text-muted">{e.kind === "note" ? `“${e.text}”` : e.text}</p>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
