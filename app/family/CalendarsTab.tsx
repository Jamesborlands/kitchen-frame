"use client";
import { useState } from "react";
import { CALENDAR_COLORS, type FamilySettings, type SettingsPatch } from "@/lib/family/settings";
import type { CalendarCheck } from "@/lib/family/calendars";
import { HoldButton } from "@/components/HoldButton";
import { clock } from "@/app/family/format";
import { ActionButton, Button, Card, fieldClass, OFFLINE } from "@/app/family/ui";

const COLOR_NAMES: Record<string, string> = {
  "#4E6A8E": "blue", "#B0607A": "rose", "#5E7E5E": "green", "#A0703A": "amber", "#7A5E8E": "purple", "#5E6E7E": "slate",
};

function eventLine(e: { title: string; start: string; allDay: boolean; date?: string }): string {
  const d = new Date(e.start);
  const day = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", weekday: "short", day: "numeric", month: "short" })
    .format(e.allDay && e.date ? new Date(`${e.date}T12:00:00Z`) : d);
  return `${day}${e.allDay ? "" : `, ${clock(d)}`} — ${e.title}`;
}

export function CalendarsTab({
  settings, onPatch, onCheck,
}: { settings: FamilySettings; onPatch: (p: SettingsPatch) => Promise<void>; onCheck: (url: string) => Promise<CalendarCheck> }) {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [color, setColor] = useState<string>(CALENDAR_COLORS[settings.calendars.length % CALENDAR_COLORS.length]);
  const [check, setCheck] = useState<CalendarCheck | "checking" | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  const runCheck = async () => {
    setCheck("checking");
    try {
      setCheck(await onCheck(url));
    } catch {
      setCheck({ ok: false, error: "Couldn't check just now — try again in a minute." });
    }
  };
  // sends just this one change, so it can't undo someone else's
  const change = async (patch: SettingsPatch) => {
    setFailed(false);
    try {
      await onPatch(patch);
    } catch {
      setFailed(true);
      throw new Error("not saved");
    }
  };
  const addIt = async () => {
    await change({ addCalendar: { name: name.trim(), url: url.trim(), color } });
    setSaved(name.trim());
    setName(""); setUrl(""); setCheck(null);
  };
  const remove = (id: string) => change({ removeCalendar: id }).catch(() => undefined);
  const checked = check !== null && check !== "checking" && check.ok;

  return (
    <div className="space-y-5">
      <Card>
        <h2 className="pb-1 text-xl">Calendars on the frame</h2>
        <p className="pb-3 text-base text-muted">Today&apos;s and tomorrow&apos;s plans show in the corner card, in each calendar&apos;s colour.</p>
        {settings.calendars.length === 0 ? (
          <p className="text-base text-muted">None yet — add one below.</p>
        ) : (
          <ul className="divide-y divide-divider">
            {settings.calendars.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-2 py-2">
                <span className="flex items-center gap-2">
                  <span aria-hidden className="h-4 w-4 rounded-full" style={{ background: c.color }} />
                  {c.name}
                </span>
                <HoldButton onConfirm={() => void remove(c.id)}>Hold to remove</HoldButton>
              </li>
            ))}
          </ul>
        )}
        {failed && <p role="alert" className="pt-2 text-base text-[#7E3A33]">{OFFLINE}</p>}
        {saved && <p role="status" className="pt-2 text-base text-sage">Added {saved} ✓ — it&apos;ll show on the frame within a few minutes.</p>}
      </Card>

      <Card>
        <h2 className="pb-3 text-xl">Add a calendar</h2>
        <div className="space-y-3">
          <label className="block text-base">Calendar name
            <input className={fieldClass} placeholder="e.g. Mum, or Home" value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label className="block text-base">Calendar link
            <textarea
              className={`${fieldClass} min-h-24 py-2 font-mono text-sm`}
              placeholder="paste the link here (see the steps below)"
              value={url}
              onChange={(e) => { setUrl(e.target.value); setCheck(null); }}
            />
          </label>
          <fieldset>
            <legend className="pb-1 text-base">Colour</legend>
            <div className="flex flex-wrap gap-2">
              {CALENDAR_COLORS.map((c) => (
                <label key={c} className="cursor-pointer">
                  <input type="radio" name="cal-color" className="peer sr-only" checked={color === c} onChange={() => setColor(c)} aria-label={COLOR_NAMES[c]} />
                  <span className="block h-12 w-12 rounded-full border-4 border-transparent peer-checked:border-ink" style={{ background: c }} />
                </label>
              ))}
            </div>
          </fieldset>
          <div className="flex flex-wrap gap-2">
            <Button onClick={runCheck} disabled={!url.trim() || check === "checking"}>{check === "checking" ? "Checking…" : "Check it"}</Button>
            <ActionButton primary run={addIt} disabled={!checked || !name.trim()}>Add this calendar</ActionButton>
          </div>
          {check && check !== "checking" && (
            check.ok ? (
              <div className="rounded-xl bg-paper p-3 text-base">
                {check.events.length === 0 ? (
                  <p>Connected ✓ — nothing in the next two weeks.</p>
                ) : (
                  <>
                    <p className="pb-1">Connected ✓ Coming up:</p>
                    <ul className="list-disc pl-5 text-muted">{check.events.map((e, i) => <li key={i}>{eventLine(e)}</li>)}</ul>
                  </>
                )}
                {!name.trim() && <p className="pt-1 text-muted">Now give it a name above, then add it.</p>}
              </div>
            ) : (
              <p role="alert" className="rounded-xl bg-[#F6E9E7] p-3 text-base text-[#7E3A33]">{check.error}</p>
            )
          )}
        </div>
      </Card>

      <details className="rounded-2xl border border-divider bg-card p-4">
        <summary className="min-h-12 cursor-pointer text-lg">Google Calendar: how to get the link</summary>
        <ol className="list-decimal space-y-2 pl-6 pt-2 text-base">
          <li>On a computer (this doesn&apos;t work in the phone app), go to <strong>calendar.google.com</strong> and sign in.</li>
          <li>Click the <strong>gear ⚙︎</strong> at the top right, then <strong>Settings</strong>.</li>
          <li>On the left, under <strong>Settings for my calendars</strong>, click the calendar you want.</li>
          <li>Scroll down to <strong>Integrate calendar</strong>.</li>
          <li>Find <strong>Secret address in iCal format</strong> and click the copy button next to it.</li>
          <li>Come back here, paste it into <strong>Calendar link</strong>, and press <strong>Check it</strong>.</li>
        </ol>
        <p className="pt-2 text-base text-muted">Keep this link private — anyone with it can see the calendar. If it ever gets shared by mistake, Google lets you reset it on the same page (then add the new one here).</p>
      </details>

      <details className="rounded-2xl border border-divider bg-card p-4">
        <summary className="min-h-12 cursor-pointer text-lg">iPhone or iPad: how to get the link</summary>
        <ol className="list-decimal space-y-2 pl-6 pt-2 text-base">
          <li>Open the <strong>Calendar</strong> app and tap <strong>Calendars</strong> at the bottom.</li>
          <li>Tap the <strong>ⓘ</strong> next to the calendar you want (it needs to be an iCloud calendar).</li>
          <li>Turn on <strong>Public Calendar</strong>, then tap <strong>Share Link…</strong> and choose <strong>Copy</strong>.</li>
          <li>Come back here, paste it into <strong>Calendar link</strong>, and press <strong>Check it</strong>.</li>
        </ol>
        <p className="pt-2 text-base text-muted">On a Mac: in Calendar, right-click the calendar → <strong>Share Calendar…</strong> → tick <strong>Public Calendar</strong> → copy the link. &ldquo;Public&rdquo; means anyone who has the long link can see it — it isn&apos;t listed anywhere.</p>
      </details>
    </div>
  );
}
