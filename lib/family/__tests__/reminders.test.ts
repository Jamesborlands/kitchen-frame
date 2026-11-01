import { describe, expect, it } from "vitest";
import { occursOn, sanitizeReminder, type Reminder } from "@/lib/family/reminders";
import { defaultSettings, patchSettings, sanitizeSettings } from "@/lib/family/settings";

const r = (repeat: Reminder["repeat"], extra: Partial<Reminder> = {}): Reminder =>
  ({ id: "r1", text: "x", time: null, color: "#4E6A8E", repeat, ...extra });

describe("occursOn", () => {
  it("once: only that date", () => {
    expect(occursOn(r({ kind: "once", date: "2026-10-17" }), "2026-10-17")).toBe(true);
    expect(occursOn(r({ kind: "once", date: "2026-10-17" }), "2026-10-18")).toBe(false);
  });

  it("weekly: on the chosen weekdays (0 = Sunday)", () => {
    const tennis = r({ kind: "weekly", days: [2, 4], everyWeeks: 1, from: "2026-01-01" }); // Tue + Thu
    expect(occursOn(tennis, "2026-10-13")).toBe(true);  // Tuesday
    expect(occursOn(tennis, "2026-10-15")).toBe(true);  // Thursday
    expect(occursOn(tennis, "2026-10-14")).toBe(false); // Wednesday
  });

  it("every other week, counted from the first one (alternate bin days)", () => {
    const bins = r({ kind: "weekly", days: [4], everyWeeks: 2, from: "2026-10-15" }); // Thu 15 Oct
    expect(occursOn(bins, "2026-10-15")).toBe(true);
    expect(occursOn(bins, "2026-10-22")).toBe(false);
    expect(occursOn(bins, "2026-10-29")).toBe(true);
    expect(occursOn(bins, "2026-10-08")).toBe(false); // before it started
  });

  it("monthly: the same day each month; the 31st falls on the last day of shorter months", () => {
    expect(occursOn(r({ kind: "monthly", day: 12 }), "2026-11-12")).toBe(true);
    expect(occursOn(r({ kind: "monthly", day: 31 }), "2026-11-30")).toBe(true);
    expect(occursOn(r({ kind: "monthly", day: 31 }), "2026-11-29")).toBe(false);
  });
});

describe("sanitizeReminder", () => {
  it("keeps a good one, trimming text", () => {
    expect(sanitizeReminder({ id: "a", text: "  Bin day ", time: "07:30", color: "#5E7E5E", repeat: { kind: "weekly", days: [4, 4, 9], everyWeeks: 2, from: "2026-10-15" } }))
      .toEqual({ id: "a", text: "Bin day", time: "07:30", color: "#5E7E5E", repeat: { kind: "weekly", days: [4], everyWeeks: 2, from: "2026-10-15" } });
  });

  it("drops broken ones", () => {
    expect(sanitizeReminder({ id: "a", text: "", repeat: { kind: "once", date: "2026-10-15" } })).toBeNull();
    expect(sanitizeReminder({ id: "a", text: "x", repeat: { kind: "once", date: "15/10/2026" } })).toBeNull();
    expect(sanitizeReminder({ id: "a", text: "x", repeat: { kind: "weekly", days: [], everyWeeks: 1, from: "2026-10-15" } })).toBeNull();
    expect(sanitizeReminder({ id: "a", text: "x", time: "25:00", repeat: { kind: "monthly", day: 3 } })).toMatchObject({ time: null });
  });
});

describe("reminders in settings", () => {
  it("start empty, are added and removed by id", () => {
    expect(defaultSettings().reminders).toEqual([]);
    const added = patchSettings(defaultSettings(), { addReminder: { text: "Mum — tennis", time: "11:00", color: "#B0607A", repeat: { kind: "weekly", days: [2], everyWeeks: 1, from: "2026-10-13" } } });
    expect(added.reminders).toHaveLength(1);
    expect(added.reminders[0].id).toMatch(/^rem-/);
    expect(patchSettings(added, { removeReminder: added.reminders[0].id }).reminders).toEqual([]);
  });

  it("news is off unless switched on", () => {
    expect(defaultSettings().showNews).toBe(false);
    expect(patchSettings(defaultSettings(), { showNews: true }).showNews).toBe(true);
    expect(sanitizeSettings({ showNews: "yes" }).showNews).toBe(false);
  });
});
