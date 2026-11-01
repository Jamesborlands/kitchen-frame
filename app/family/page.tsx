"use client";
import type { PlaceResult } from "@/lib/geo/geocode";
import { useRef, useState } from "react";
import useSWR from "swr";
import { useNow } from "@/lib/hooks/useNow";
import { FamilyView, type FamilyData, type ItemAction } from "@/app/family/FamilyView";
import type { ItemKind } from "@/lib/frame/store";
import type { SettingsPatch } from "@/lib/family/settings";
import type { CalendarCheck } from "@/lib/family/calendars";

// /family — PIN-gated like the rest of the site. Refreshes every 30s so a photo
// sent on WhatsApp shows up without reloading. A delete offers "Undo" for 10s.
const UNDO_MS = 10_000;

// signed out (the PIN was changed, or the sign-in expired): back to the PIN screen
function signInAgain(): never {
  window.location.replace(new URL("/unlock?from=/family", window.location.origin).href); // a full load, fresh sign-in
  throw new Error("signed out");
}

async function send(method: string, url: string, body: unknown): Promise<Response> {
  const res = await fetch(url, { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  if (res.status === 401) signInAgain();
  if (!res.ok && res.status !== 404) throw new Error(`${url} ${res.status}`);
  return res;
}

async function load(): Promise<FamilyData> {
  const res = await fetch("/api/family");
  if (res.status === 401) signInAgain();
  if (!res.ok) throw new Error(`/api/family ${res.status}`);
  return (await res.json()) as FamilyData;
}

export default function FamilyPage() {
  const now = useNow();
  const { data, error, mutate } = useSWR<FamilyData>("family", load, { refreshInterval: 30_000 });
  const [undo, setUndo] = useState<{ kind: ItemKind; id: string } | null>(null);
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onItem = async (action: ItemAction, kind: ItemKind, id: string, from?: string) => {
    await send("POST", "/api/family/item", { action, kind, id, from });
    await mutate();
    if (undoTimer.current) clearTimeout(undoTimer.current);
    if (action === "delete") {
      setUndo({ kind, id });
      undoTimer.current = setTimeout(() => setUndo(null), UNDO_MS);
    } else {
      setUndo(null);
    }
  };
  const onPatchSettings = async (p: SettingsPatch) => {
    await send("PATCH", "/api/family/settings", p);
    await mutate();
  };
  const onTodo = async (action: "add" | "toggle" | "remove", value: string) => {
    await send("POST", "/api/family/todos", action === "add" ? { action, text: value } : { action, id: value });
    await mutate();
  };
  const onCheckCalendar = async (url: string) =>
    (await (await send("POST", "/api/family/calendar-check", { url })).json()) as CalendarCheck;

  const onSearchPlaces = async (q: string) =>
    ((await (await fetch(`/api/family/places?q=${encodeURIComponent(q)}`)).json()) as { results: PlaceResult[] }).results;

  if (!data) {
    return <p className="p-6 text-lg text-muted">{error ? "Couldn't load — check the internet connection and refresh." : "loading…"}</p>;
  }
  return (
    <>
      <FamilyView data={data} now={now.getTime()} onItem={onItem} onPatchSettings={onPatchSettings} onCheckCalendar={onCheckCalendar} onSearchPlaces={onSearchPlaces} onTodo={onTodo} />
      {undo && (
        <div role="status" className="fixed inset-x-0 bottom-4 z-20 mx-auto flex w-fit items-center gap-4 rounded-full bg-ink px-5 py-2 text-lg text-paper shadow-lg">
          Deleted.
          <button type="button" className="min-h-12 rounded-full px-4 underline" onClick={() => void onItem("restore", undo.kind, undo.id)}>
            Undo
          </button>
        </div>
      )}
    </>
  );
}
