"use client";
import { useState } from "react";
import { CALENDAR_COLORS } from "@/lib/family/colors";
import type { Reminder } from "@/lib/family/reminders";
import type { FamilySettings, SettingsPatch } from "@/lib/family/settings";
import { HoldButton } from "@/components/HoldButton";
import { ActionButton, Card, fieldClass, OFFLINE } from "@/app/family/ui";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY_NAMES = ["Sundays", "Mondays", "Tuesdays", "Wednesdays", "Thursdays", "Fridays", "Saturdays"];

function clock(hhmm: string): string {
  const h = +hhmm.slice(0, 2), m = hhmm.slice(3, 5);
  return `${h % 12 === 0 ? 12 : h % 12}${m === "00" ? "" : `:${m}`}${h < 12 ? "am" : "pm"}`;
}

const ordinal = (n: number) => `${n}${n % 10 === 1 && n !== 11 ? "st" : n % 10 === 2 && n !== 12 ? "nd" : n % 10 === 3 && n !== 13 ? "rd" : "th"}`;

/** "Tuesdays at 11am", "Every other Thursday", "Sat 17 Oct", "The 12th of each month". */
export function describeReminder(r: Reminder): string {
  const at = r.time ? ` at ${clock(r.time)}` : "";
  const rep = r.repeat;
  if (rep.kind === "once") {
    return new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${rep.date}T12:00:00Z`)) + at;
  }
  if (rep.kind === "monthly") return `The ${ordinal(rep.day)} of each month${at}`;
  if (rep.everyWeeks === 2) return `Every other ${DAY_NAMES[rep.days[0]].slice(0, -1)}${at}`;
  const names = rep.days.map((d) => DAY_NAMES[d]);
  return (names.length > 1 ? `${names.slice(0, -1).join(", ")} and ${names.at(-1)}` : names[0]) + at;
}

type Kind = "once" | "weekly" | "fortnightly" | "monthly";
const KINDS: { value: Kind; label: string }[] = [
  { value: "once", label: "One day" },
  { value: "weekly", label: "Every week" },
  { value: "fortnightly", label: "Every other week" },
  { value: "monthly", label: "Every month" },
];

export function RemindersTab({ settings, onPatch }: { settings: FamilySettings; onPatch: (p: SettingsPatch) => Promise<void> }) {
  const [text, setText] = useState("");
  const [kind, setKind] = useState<Kind>("weekly");
  const [date, setDate] = useState("");
  const [days, setDays] = useState<number[]>([]);
  const [time, setTime] = useState("");
  const [color, setColor] = useState<string>(CALENDAR_COLORS[2]);
  const [failed, setFailed] = useState(false);

  const repeat = (): Reminder["repeat"] | null => {
    if (kind === "once") return date ? { kind: "once", date } : null;
    if (kind === "fortnightly") return date ? { kind: "weekly", days: [new Date(`${date}T12:00:00Z`).getUTCDay()], everyWeeks: 2, from: date } : null;
    if (kind === "monthly") return date ? { kind: "monthly", day: +date.slice(8, 10) } : null;
    return days.length ? { kind: "weekly", days: [...days].sort(), everyWeeks: 1, from: new Date().toISOString().slice(0, 10) } : null;
  };
  const ready = text.trim() && repeat();

  const add = async () => {
    const rep = repeat();
    if (!rep || !text.trim()) return;
    setFailed(false);
    try {
      await onPatch({ addReminder: { text: text.trim(), time: time || null, color, repeat: rep } });
      setText(""); setDate(""); setDays([]); setTime("");
    } catch {
      setFailed(true);
    }
  };
  const remove = (id: string) => onPatch({ removeReminder: id }).catch(() => setFailed(true));

  return (
    <div className="space-y-5">
      <Card>
        <h2 className="pb-1 text-xl">On the frame</h2>
        <p className="pb-3 text-base text-muted">These show in &ldquo;Happening today&rdquo; on the day — like bin day, tennis, or someone visiting.</p>
        {settings.reminders.length === 0 ? (
          <p className="text-base text-muted">None yet — add one below.</p>
        ) : (
          <ul className="divide-y divide-divider">
            {settings.reminders.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-2 py-2">
                <span className="flex items-center gap-3">
                  <span aria-hidden className="h-4 w-4 shrink-0 rounded-full" style={{ background: r.color }} />
                  <span><span className="block">{r.text}</span><span className="block text-base text-muted">{describeReminder(r)}</span></span>
                </span>
                <HoldButton onConfirm={() => void remove(r.id)}>Hold to remove</HoldButton>
              </li>
            ))}
          </ul>
        )}
        {failed && <p role="alert" className="pt-2 text-base text-[#7E3A33]">{OFFLINE}</p>}
      </Card>

      <Card>
        <h2 className="pb-3 text-xl">Add a reminder</h2>
        <div className="space-y-3">
          <label className="block text-base">What
            <input className={fieldClass} placeholder="e.g. Bin day — recycling, or Mum: tennis" value={text} onChange={(e) => setText(e.target.value)} />
          </label>
          <fieldset>
            <legend className="pb-1 text-base">When</legend>
            <div className="grid grid-cols-2 gap-2">
              {KINDS.map((k) => (
                <label key={k.value} className="flex min-h-12 items-center gap-2 rounded-xl border border-divider bg-white px-3 text-base">
                  <input type="radio" name="rem-kind" className="h-5 w-5" checked={kind === k.value} onChange={() => setKind(k.value)} />
                  {k.label}
                </label>
              ))}
            </div>
          </fieldset>
          {kind === "weekly" ? (
            <fieldset>
              <legend className="pb-1 text-base">On</legend>
              <div className="flex flex-wrap gap-2">
                {DAYS.map((d, i) => (
                  <label key={d} className="flex min-h-12 items-center gap-2 rounded-xl border border-divider bg-white px-3 text-base">
                    <input type="checkbox" className="h-5 w-5" aria-label={d} checked={days.includes(i)}
                      onChange={() => setDays((ds) => (ds.includes(i) ? ds.filter((x) => x !== i) : [...ds, i]))} />
                    {d}
                  </label>
                ))}
              </div>
            </fieldset>
          ) : (
            <label className="block text-base">{kind === "once" ? "Date" : kind === "fortnightly" ? "First date" : "Date"}
              <input type="date" className={fieldClass} value={date} onChange={(e) => setDate(e.target.value)} />
            </label>
          )}
          <label className="block text-base">Time (leave empty for all day)
            <input type="time" className={fieldClass} value={time} onChange={(e) => setTime(e.target.value)} />
          </label>
          <fieldset>
            <legend className="pb-1 text-base">Colour</legend>
            <div className="flex flex-wrap gap-2">
              {CALENDAR_COLORS.map((c) => (
                <label key={c} className="cursor-pointer">
                  <input type="radio" name="rem-color" className="peer sr-only" checked={color === c} onChange={() => setColor(c)} aria-label={`colour ${c}`} />
                  <span className="block h-12 w-12 rounded-full border-4 border-transparent peer-checked:border-ink" style={{ background: c }} />
                </label>
              ))}
            </div>
          </fieldset>
          <ActionButton primary run={add} disabled={!ready}>Add reminder</ActionButton>
        </div>
      </Card>
    </div>
  );
}
