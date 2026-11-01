import { describe, expect, it } from "vitest";
import { buildAgenda, buildToday } from "@/lib/kitchen/feed/today";
import type { Reminder } from "@/lib/family/reminders";

// Monday 12 Oct 2026, 9:00 in Ludlow
const NOW = new Date("2026-10-12T08:00:00Z");
const rem = (text: string, time: string | null, repeat: Reminder["repeat"], color = "#5E7E5E"): Reminder => ({ id: text, text, time, color, repeat });
const mum = { id: "mum", name: "Mum", url: "https://x/m.ics", color: "#B0607A" };

describe("buildToday", () => {
  it("today's reminders, calendar events and birthdays, all-day first then by time", () => {
    const t = buildToday({
      now: NOW,
      reminders: [
        rem("Mum — tennis", "11:00", { kind: "weekly", days: [1], everyWeeks: 1, from: "2026-01-01" }),
        rem("Bin day — recycling", null, { kind: "weekly", days: [1], everyWeeks: 2, from: "2026-10-12" }),
        rem("Tom in town", null, { kind: "once", date: "2026-10-13" }),
      ],
      calendar: [{ cal: mum, event: { title: "Dentist", start: "2026-10-12T13:30:00.000Z", allDay: false } }],
      occasions: [{ name: "Kate", month: 10, day: 12, kind: "birthday" }],
    });
    expect(t.label).toBe("Monday 12 October");
    expect(t.items.map((i) => [i.time, i.text])).toEqual([
      ["all day", "Kate's birthday"],
      ["all day", "Bin day — recycling"],
      ["11am", "Mum — tennis"],
      ["2:30pm", "Dentist · Mum"],
    ]);
    expect(t.items[3].color).toBe("#B0607A");
    expect(t.tomorrow.map((i) => i.text)).toEqual(["Tom in town"]);
  });

  it("events already over today drop off; later ones stay", () => {
    const t = buildToday({
      now: new Date("2026-10-12T13:00:00Z"), // 2pm
      reminders: [rem("Coffee", "10:00", { kind: "once", date: "2026-10-12" }), rem("Tea", "16:00", { kind: "once", date: "2026-10-12" })],
      calendar: [], occasions: [],
    });
    expect(t.items.map((i) => i.text)).toEqual(["Tea"]);
  });

  it("a quiet day is just empty", () => {
    const t = buildToday({ now: NOW, reminders: [], calendar: [], occasions: [] });
    expect(t.items).toEqual([]);
    expect(t.tomorrow).toEqual([]);
  });
});

describe("buildAgenda (the calendar panel)", () => {
  it("the next two weeks, day by day, only days with something on", () => {
    const days = buildAgenda({
      now: NOW, days: 14,
      reminders: [rem("Bin day", null, { kind: "weekly", days: [4], everyWeeks: 2, from: "2026-10-15" })],
      calendar: [{ cal: mum, event: { title: "Dentist", start: "2026-10-12T13:30:00.000Z", allDay: false } }],
      occasions: [{ name: "Kate", month: 10, day: 20, kind: "birthday" }],
    });
    expect(days.map((d) => [d.label, d.items.map((i) => i.text)])).toEqual([
      ["Today", ["Dentist · Mum"]],
      ["Thu 15 Oct", ["Bin day"]],
      ["Tue 20 Oct", ["Kate's birthday"]],
    ]); // 14 days from Mon 12 Oct run to Sun 25 Oct, so the next bin day (29th) is outside
  });

  it("tomorrow is called tomorrow", () => {
    const days = buildAgenda({ now: NOW, days: 3, reminders: [rem("Golf", "10:00", { kind: "once", date: "2026-10-13" })], calendar: [], occasions: [] });
    expect(days[0]).toMatchObject({ label: "Tomorrow", date: "2026-10-13" });
  });
});

describe("in the household's own time zone", () => {
  it("the day and what's still to come are local", () => {
    // 01:30 UTC on 13 Oct is still the evening of 12 Oct in California
    const now = new Date(Date.UTC(2026, 9, 13, 1, 30));
    const t = buildToday({ now, reminders: [], calendar: [], occasions: [{ name: "Gran", day: 12, month: 10, kind: "birthday" }], timeZone: "America/Los_Angeles" });
    expect(t.label).toMatch(/Monday 12 October/);
    expect(t.items.map((i) => i.text)).toEqual(["Gran's birthday"]);
    expect(buildToday({ now, reminders: [], calendar: [], occasions: [] }).label).toMatch(/Tuesday 13 October/); // London by default
  });
});

