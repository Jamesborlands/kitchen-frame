"use client";
// /family — the page the household uses to look after the kitchen frame.
// Pure: data and actions come in as props (page.tsx does the fetching).
import { useState } from "react";
import { OFFLINE } from "@/app/family/ui";
import type { AdminView, ItemKind } from "@/lib/frame/store";
import type { FamilySettings, SettingsPatch } from "@/lib/family/settings";
import type { CalendarCheck } from "@/lib/family/calendars";
import { lastSeenLabel } from "@/app/kitchen/status/StatusView";
import { PhotosTab } from "@/app/family/PhotosTab";
import { MessagesTab } from "@/app/family/MessagesTab";
import { CalendarsTab } from "@/app/family/CalendarsTab";
import { SettingsTab } from "@/app/family/SettingsTab";
import type { PlaceResult } from "@/lib/geo/geocode";
import { BinTab } from "@/app/family/BinTab";
import { RemindersTab } from "@/app/family/RemindersTab";
import { TodoTab, type TodoAction } from "@/app/family/TodoTab";
import type { Todo } from "@/lib/family/todos";

export interface FamilyData extends AdminView {
  settings: FamilySettings;
  todos: Todo[];
  frameLastSeen: number | null;
}

export type ItemAction = "hide" | "show" | "delete" | "restore" | "setFrom";

export interface FamilyActions {
  onItem: (action: ItemAction, kind: ItemKind, id: string, from?: string) => Promise<void>;
  onPatchSettings: (p: SettingsPatch) => Promise<void>;
  onCheckCalendar: (url: string) => Promise<CalendarCheck>;
  onSearchPlaces?: (q: string) => Promise<PlaceResult[]>;
  onTodo: (action: TodoAction, value: string) => Promise<void>;
}

const TABS = ["Photos", "Messages", "Reminders", "To-do", "Calendars", "Settings", "Bin"] as const;
type Tab = (typeof TABS)[number];
const QUIET_AFTER_MS = 60 * 60_000;

export function FamilyView({ data, now, ...actions }: { data: FamilyData; now: number } & FamilyActions) {
  const [tab, setTab] = useState<Tab>("Photos");
  const [failed, setFailed] = useState(false);
  // every photo/message action reports failure here rather than silently doing nothing
  const onItem = async (action: ItemAction, kind: ItemKind, id: string, from?: string) => {
    setFailed(false);
    try {
      await (from === undefined ? actions.onItem(action, kind, id) : actions.onItem(action, kind, id, from));
    } catch {
      setFailed(true);
    }
  };
  const quiet = data.frameLastSeen === null || now - data.frameLastSeen > QUIET_AFTER_MS;
  return (
    <main className="mx-auto max-w-3xl px-4 pb-24 text-lg">
      <header className="pt-8 pb-4">
        <h1 className="font-[family-name:var(--font-cormorant)] text-4xl">the kitchen frame</h1>
        <p className="text-base text-muted">frame last seen {lastSeenLabel(data.frameLastSeen, now)}</p>
        {quiet && (
          <p className="mt-1 text-base" style={{ color: "#7E3A33" }}>
            The frame hasn&apos;t been in touch for a while — check it&apos;s plugged in and the Wi-Fi is on.
          </p>
        )}
      </header>

      <nav role="tablist" aria-label="sections" className="sticky top-0 z-10 -mx-4 flex flex-wrap gap-2 bg-paper/95 px-4 py-2 backdrop-blur">
        {TABS.map((t) => (
          <button
            key={t}
            role="tab"
            type="button"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`min-h-12 rounded-full px-4 text-base ${tab === t ? "bg-ink text-paper" : "bg-card text-ink"}`}
          >
            {t}
            {t === "Bin" && data.trash.length > 0 ? ` (${data.trash.length})` : ""}
          </button>
        ))}
      </nav>

      {failed && (
        <p role="alert" className="mt-3 rounded-xl bg-[#F6E9E7] p-3 text-base text-[#7E3A33]">{OFFLINE}</p>
      )}

      <div className="pt-4">
        {tab === "Photos" && <PhotosTab photos={data.photos} names={familyNames(data)} onItem={onItem} />}
        {tab === "Messages" && <MessagesTab log={data.log} notes={data.notes} onItem={onItem} />}
        {tab === "Reminders" && <RemindersTab settings={data.settings} onPatch={actions.onPatchSettings} />}
        {tab === "To-do" && <TodoTab todos={data.todos} onTodo={actions.onTodo} />}
        {tab === "Calendars" && (
          <CalendarsTab settings={data.settings} onPatch={actions.onPatchSettings} onCheck={actions.onCheckCalendar} />
        )}
        {tab === "Settings" && <SettingsTab settings={data.settings} onPatch={actions.onPatchSettings} onSearchPlaces={actions.onSearchPlaces} />}
        {tab === "Bin" && <BinTab trash={data.trash} onItem={onItem} now={now} />}
      </div>
    </main>
  );
}

/** Everyone the family page knows of: senders so far and the people on the family clocks ("Anne & Peter" is two). */
export function familyNames(d: Pick<FamilyData, "photos" | "notes" | "settings">): string[] {
  const all = [
    ...d.photos.map((p) => p.from),
    ...d.notes.map((n) => n.from),
    ...d.settings.places.flatMap((p) => p.sublabel.split(/\s*(?:&|,|\band\b)\s*/)),
  ].map((n) => n.trim()).filter((n) => n && n.length <= 30 && !/^the\b/i.test(n));
  return [...new Set(all)];
}
