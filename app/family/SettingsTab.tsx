"use client";
import { useState } from "react";
import { daysInMonth, MODULE_KEYS, type FamilySettings, type Modules, type PhotoFit, type Place, type SettingsPatch } from "@/lib/family/settings";
import { movePlace, placeFromResult, type PlaceResult } from "@/lib/geo/geocode";
import type { Occasion, OccasionKind } from "@/lib/occasions";
import { hourLabel, MONTHS } from "@/app/family/format";
import { ActionButton, Card, fieldClass } from "@/app/family/ui";

const SPEEDS = [10, 20, 30, 60, 120, 300];
const FITS: { value: PhotoFit; label: string; help: string }[] = [
  { value: "smart", label: "Smart", help: "Landscape photos fill the space; tall photos are shown whole." },
  { value: "whole", label: "Whole photo", help: "Never cuts anything off — there may be blurred edges." },
  { value: "fill", label: "Fill the space", help: "Always fills the space — the edges of some photos get cut off." },
];
const KINDS: { value: OccasionKind; label: string }[] = [
  { value: "birthday", label: "Birthday" },
  { value: "anniversary", label: "Anniversary" },
  { value: "event", label: "Something else" },
];

const MODULE_LABELS: Record<keyof Modules, { label: string; help: string }> = {
  clocks: { label: "Family clocks", help: "The time and weather where everyone is." },
  today: { label: "Happening today", help: "Reminders, the calendar, birthdays and weather tips." },
  todos: { label: "To-do list", help: "The To-do button on the sidebar." },
  rides: { label: "Rides & walks", help: "The best days this week to get outside." },
  board: { label: "Message board", help: "The flip board of WhatsApp messages." },
  photos: { label: "Photos", help: "The photo slideshow." },
};

const speedLabel = (s: number) => (s < 60 ? `${s} seconds` : s === 60 ? "1 minute" : `${s / 60} minutes`);

// Every change saves straight away (no Save button to forget, nothing lost on
// switching tab) and sends only what changed, so two people editing don't clash.
export function SettingsTab({ settings, onPatch, onSearchPlaces }: {
  settings: FamilySettings;
  onPatch: (p: SettingsPatch) => Promise<void>;
  onSearchPlaces?: (q: string) => Promise<PlaceResult[]>;
}) {
  const [draft, setDraft] = useState(settings);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "failed">("idle");
  const [add, setAdd] = useState({ name: "", day: "", month: "", year: "", kind: "birthday" as OccasionKind });

  const save = async (patch: SettingsPatch, local: Partial<FamilySettings>) => {
    const before = draft;
    setDraft((d) => ({ ...d, ...local }));
    setStatus("saving");
    try {
      await onPatch(patch);
      setStatus("saved");
    } catch {
      setDraft(before); // show what's really saved
      setStatus("failed");
      throw new Error("not saved");
    }
  };
  const set = (patch: Partial<Pick<FamilySettings, "nightStartHour" | "nightEndHour" | "photoSlideSec" | "photoFit" | "showNews">>) =>
    void save(patch, patch).catch(() => undefined);

  const addOccasion = async () => {
    const o: Occasion = { name: add.name.trim(), day: Number(add.day), month: Number(add.month), kind: add.kind };
    if (add.year) o.year = Number(add.year);
    if (!o.name || !o.day || !o.month) return;
    await save({ addOccasion: o }, { occasions: [...draft.occasions, o] });
    setAdd({ name: "", day: "", month: "", year: "", kind: "birthday" });
  };
  const removeOccasion = (o: Occasion) => save({ removeOccasion: o }, { occasions: draft.occasions.filter((x) => x !== o) });

  const setModule = (k: keyof Modules, on: boolean) => {
    const modules = { ...draft.modules, [k]: on };
    void save({ modules }, { modules }).catch(() => undefined);
  };
  const savePlaces = (places: Place[]) => save({ places }, { places });

  const maxDay = daysInMonth(Number(add.month) || 1);

  const speeds = SPEEDS.includes(draft.photoSlideSec) ? SPEEDS : [...SPEEDS, draft.photoSlideSec].sort((a, b) => a - b);

  return (
    <div className="space-y-5">
      <Card>
        <h2 className="pb-3 text-xl">Night time</h2>
        <p className="pb-3 text-base text-muted">The screen dims to a clock overnight and wakes by itself. A tap wakes it for 5 minutes.</p>
        <div className="grid grid-cols-2 gap-3">
          <label className="text-base">
            Goes dim at
            <select className={fieldClass} value={draft.nightStartHour} onChange={(e) => set({ nightStartHour: Number(e.target.value) })}>
              {Array.from({ length: 24 }, (_, h) => <option key={h} value={h}>{hourLabel(h)}</option>)}
            </select>
          </label>
          <label className="text-base">
            Wakes at
            <select className={fieldClass} value={draft.nightEndHour} onChange={(e) => set({ nightEndHour: Number(e.target.value) })}>
              {Array.from({ length: 24 }, (_, h) => <option key={h} value={h}>{hourLabel(h)}</option>)}
            </select>
          </label>
        </div>
      </Card>

      <Card>
        <h2 className="pb-3 text-xl">Photos</h2>
        <label className="block text-base">
          Each photo stays for
          <select className={fieldClass} value={draft.photoSlideSec} onChange={(e) => set({ photoSlideSec: Number(e.target.value) })}>
            {speeds.map((s) => <option key={s} value={s}>{speedLabel(s)}</option>)}
          </select>
        </label>
        <fieldset className="mt-4 space-y-2">
          <legend className="pb-1 text-base">How photos fit</legend>
          {FITS.map((f) => (
            <label key={f.value} className="flex min-h-12 items-start gap-3 rounded-xl border border-divider bg-white p-3 text-base">
              <input type="radio" name="fit" className="mt-1 h-5 w-5" checked={draft.photoFit === f.value} onChange={() => set({ photoFit: f.value })} />
              <span>{f.label}<span className="block text-muted">{f.help}</span></span>
            </label>
          ))}
        </fieldset>
      </Card>

      <Card>
        <h2 className="pb-1 text-xl">On the frame</h2>
        <p className="pb-3 text-base text-muted">Switch off anything you don&apos;t want; the rest of the screen fills the space.</p>
        <div className="space-y-2">
          {MODULE_KEYS.map((k) => (
            <label key={k} className="flex min-h-12 items-start gap-3 rounded-xl border border-divider bg-white p-3 text-base">
              <input type="checkbox" className="mt-1 h-5 w-5" checked={draft.modules[k]} onChange={(e) => setModule(k, e.target.checked)} />
              <span>{MODULE_LABELS[k].label}<span className="block text-muted">{MODULE_LABELS[k].help}</span></span>
            </label>
          ))}
        </div>
      </Card>

      <PlacesCard places={draft.places} onSave={savePlaces} onSearch={onSearchPlaces} />

      <Card>
        <h2 className="pb-1 text-xl">Happening today</h2>
        <label className="flex min-h-12 items-start gap-3 rounded-xl border border-divider bg-white p-3 text-base">
          <input type="checkbox" className="mt-1 h-5 w-5" checked={draft.showNews} onChange={(e) => set({ showNews: e.target.checked })} />
          <span>Show news headlines<span className="block text-muted">Off by default — headlines can be gloomy. Reminders, the calendar, birthdays and weather tips always show.</span></span>
        </label>
      </Card>

      <Card>
        <h2 className="pb-1 text-xl">Birthdays and special days</h2>
        <p className="pb-3 text-base text-muted">The frame counts down to these in the two weeks before.</p>
        <ul className="divide-y divide-divider">
          {draft.occasions.map((o, i) => (
            <li key={`${o.name}-${o.month}-${o.day}-${i}`} className="flex items-center justify-between gap-2 py-2 text-base">
              <span>
                {o.name} <span className="text-muted">· {o.day} {MONTHS[o.month - 1]}{o.year ? ` ${o.year}` : ""} · {KINDS.find((k) => k.value === o.kind)?.label}</span>
              </span>
              <ActionButton aria-label={`remove ${o.name}`} run={() => removeOccasion(o)}>Remove</ActionButton>
            </li>
          ))}
        </ul>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
          <label className="col-span-2 text-base">Name
            <input className={fieldClass} value={add.name} onChange={(e) => setAdd({ ...add, name: e.target.value })} />
          </label>
          <label className="text-base">Day
            <select className={fieldClass} value={add.day} onChange={(e) => setAdd({ ...add, day: e.target.value })}>
              <option value="">–</option>
              {Array.from({ length: maxDay }, (_, d) => <option key={d + 1} value={d + 1}>{d + 1}</option>)}
            </select>
          </label>
          <label className="text-base">Month
            <select
              className={fieldClass}
              value={add.month}
              onChange={(e) => {
                const month = e.target.value;
                // 31 → 30 when switching to a shorter month
                const day = add.day && Number(add.day) > daysInMonth(Number(month) || 1) ? "" : add.day;
                setAdd({ ...add, month, day });
              }}
            >
              <option value="">–</option>
              {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
            </select>
          </label>
          <label className="text-base">Year (optional)
            <input className={fieldClass} inputMode="numeric" value={add.year} onChange={(e) => setAdd({ ...add, year: e.target.value.replace(/\D/g, "").slice(0, 4) })} />
          </label>
          <label className="col-span-2 text-base">Type
            <select className={fieldClass} value={add.kind} onChange={(e) => setAdd({ ...add, kind: e.target.value as OccasionKind })}>
              {KINDS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
            </select>
          </label>
          <div className="col-span-2 flex items-end sm:col-span-3">
            <ActionButton run={addOccasion} disabled={!add.name.trim() || !add.day || !add.month}>Add date</ActionButton>
          </div>
        </div>
      </Card>

      <p className="sticky bottom-0 -mx-4 min-h-12 bg-paper/95 px-4 py-3 text-base backdrop-blur" role="status">
        {status === "idle" && <span className="text-muted">Changes save as soon as you make them.</span>}
        {status === "saving" && <span className="text-muted">Saving…</span>}
        {status === "saved" && <span className="text-sage">Saved ✓ — the frame updates within a couple of minutes.</span>}
        {status === "failed" && <span className="text-[#7E3A33]">Couldn&apos;t save that — check the internet connection and try again.</span>}
      </p>
    </div>
  );
}

/** The family clocks: who's where. Up to four; new ones are found by name. */
function PlacesCard({ places, onSave, onSearch }: {
  places: Place[];
  onSave: (places: Place[]) => Promise<void>;
  onSearch?: (q: string) => Promise<PlaceResult[]>;
}) {
  const [q, setQ] = useState("");
  const [who, setWho] = useState("");
  const [results, setResults] = useState<PlaceResult[] | null>(null);
  const [moving, setMoving] = useState<string | null>(null);
  const full = places.length >= 4;
  return (
    <Card>
      <h2 className="pb-1 text-xl">Family clocks</h2>
      <p className="pb-3 text-base text-muted">The time and weather where everyone is (up to four).</p>
      <ul aria-label="family clocks" className="divide-y divide-divider">
        {places.map((p) => (
          <li key={p.key} className="py-2 text-base">
            <div className="flex items-center justify-between gap-2">
              <span>{p.label}{p.sublabel && <span className="text-muted"> · {p.sublabel}</span>}</span>
              <span className="flex gap-2">
                {onSearch && (
                  <ActionButton aria-label={`move ${p.sublabel || p.label}`} run={async () => setMoving(moving === p.key ? null : p.key)}>Move</ActionButton>
                )}
                <ActionButton aria-label={`remove ${p.label}`} run={() => onSave(places.filter((x) => x.key !== p.key))}>Remove</ActionButton>
              </span>
            </div>
            {moving === p.key && onSearch && (
              <MoveTo
                who={p.sublabel || p.label}
                onSearch={onSearch}
                onPick={async (r) => { await onSave(places.map((x) => (x.key === p.key ? movePlace(x, r) : x))); setMoving(null); }}
              />
            )}
          </li>
        ))}
      </ul>
      {onSearch && !full && (
        <div className="mt-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <label className="text-base">Find a place
              <input className={fieldClass} value={q} placeholder="e.g. Bristol" onChange={(e) => setQ(e.target.value)} />
            </label>
            <label className="text-base">Who&apos;s there
              <input className={fieldClass} value={who} placeholder="e.g. Sophie" onChange={(e) => setWho(e.target.value)} />
            </label>
          </div>
          <ActionButton run={async () => setResults(await onSearch(q))} disabled={!q.trim()}>Search</ActionButton>
          {results && results.length === 0 && <p className="text-base text-muted">Nothing found — try another spelling.</p>}
          {results && results.length > 0 && (
            <ul className="space-y-2">
              {results.map((r) => (
                <li key={`${r.latitude},${r.longitude}`} className="flex items-center justify-between gap-2 text-base">
                  <span>{r.name}<span className="text-muted"> · {r.where}</span></span>
                  <ActionButton
                    aria-label={`add ${r.name}, ${r.where}`}
                    run={async () => { await onSave([...places, placeFromResult(r, who)]); setResults(null); setQ(""); setWho(""); }}
                  >Add</ActionButton>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Card>
  );
}

/** "Kate moved": find the new town and pick it; the clock keeps who it is. */
function MoveTo({ who, onSearch, onPick }: { who: string; onSearch: (q: string) => Promise<PlaceResult[]>; onPick: (r: PlaceResult) => Promise<void> }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<PlaceResult[] | null>(null);
  return (
    <div className="mt-3 space-y-3 rounded-xl border border-divider bg-white p-3">
      <div className="flex items-end gap-2">
        <label className="flex-1 text-base">Where to?
          <input className={fieldClass} value={q} placeholder={`Where ${who} lives now`} onChange={(e) => setQ(e.target.value)} />
        </label>
        <ActionButton run={async () => setResults(await onSearch(q))} disabled={!q.trim()}>Find</ActionButton>
      </div>
      {results && results.length === 0 && <p className="text-base text-muted">Nothing found — try another spelling.</p>}
      {results && results.length > 0 && (
        <ul className="space-y-2">
          {results.map((r) => (
            <li key={`${r.latitude},${r.longitude}`} className="flex items-center justify-between gap-2 text-base">
              <span>{r.name}<span className="text-muted"> · {r.where}</span></span>
              <ActionButton aria-label={`move to ${r.name}, ${r.where}`} run={() => onPick(r)}>Move here</ActionButton>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
