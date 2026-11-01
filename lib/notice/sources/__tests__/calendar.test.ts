import { describe, expect, it } from "vitest";
import { calendarCards, calendarCardsFor, calendarSource } from "@/lib/notice/sources/calendar";
import { memoryCalendarCache } from "@/lib/family/calendarCache";
import { buildContext } from "@/lib/notice/card";
import type { CalendarLink } from "@/lib/family/settings";

const mum: CalendarLink = { id: "mum", name: "Mum", url: "https://cal.example/mum.ics", color: "#B0607A" };
const home: CalendarLink = { id: "home", name: "Home", url: "https://cal.example/home.ics", color: "#4E6A8E" };
// 9am in Ludlow (BST)
const NOW = new Date("2026-10-12T08:00:00Z");
const timed = (title: string, start: string) => ({ title, start, allDay: false });
const allDay = (title: string, date: string) => ({ title, start: `${date}T00:00:00.000Z`, allDay: true, date });

describe("calendarCards", () => {
  it("words today's and tomorrow's events the way you'd say them", () => {
    const cards = calendarCards([
      { cal: mum, event: timed("Dentist", "2026-10-12T13:30:00.000Z") },
      { cal: home, event: timed("Golf", "2026-10-13T09:00:00.000Z") },
      { cal: home, event: allDay("Bin day", "2026-10-12") },
    ], NOW);
    expect(cards.map((c) => [c.label, c.title])).toEqual([
      ["Home", "Today — Bin day"],
      ["Mum", "Today 2:30pm — Dentist"],
      ["Home", "Tomorrow 10am — Golf"],
    ]);
  });

  it("colours each card like its calendar and ranks today above tomorrow", () => {
    const [today, tomorrow] = calendarCards([
      { cal: mum, event: timed("Dentist", "2026-10-12T13:30:00.000Z") },
      { cal: home, event: timed("Golf", "2026-10-13T09:00:00.000Z") },
    ], NOW);
    expect(today).toMatchObject({ kind: "calendar", color: "#B0607A" });
    expect(tomorrow).toMatchObject({ color: "#4E6A8E" });
    expect(today.priority).toBeGreaterThan(tomorrow.priority);
  });

  it("leaves out what's already started, and anything after tomorrow", () => {
    const cards = calendarCards([
      { cal: mum, event: timed("Breakfast", "2026-10-12T07:00:00.000Z") },
      { cal: mum, event: allDay("Yesterday thing", "2026-10-11") },
      { cal: mum, event: timed("Next week", "2026-10-19T09:00:00.000Z") },
      { cal: mum, event: allDay("Wednesday", "2026-10-14") },
    ], NOW);
    expect(cards).toEqual([]);
  });

  it("shows at most four", () => {
    const events = Array.from({ length: 9 }, (_, i) => ({ cal: mum, event: timed(`e${i}`, `2026-10-12T1${i}:00:00.000Z`) }));
    expect(calendarCards(events, NOW)).toHaveLength(4);
  });
});

describe("calendarSource", () => {
  const ics = (body: string) => `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:t\r\n${body}END:VCALENDAR\r\n`;
  const ev = (start: string, summary: string, dateOnly = false) =>
    `BEGIN:VEVENT\r\nUID:${summary}\r\nDTSTAMP:20261001T000000Z\r\nDTSTART${dateOnly ? ";VALUE=DATE" : ""}:${start}\r\nSUMMARY:${summary}\r\nEND:VEVENT\r\n`;

  it("reads every calendar in the settings, and a broken one costs only its own cards", async () => {
    const fetchImpl = (async (url: string) => {
      if (url.includes("mum")) return new Response(ics(ev("20261012T133000Z", "Dentist") + ev("20261012", "Bin day", true)));
      return new Response("gone", { status: 404 });
    }) as unknown as typeof fetch;
    const ctx = { ...buildContext(NOW), calendars: [mum, home] };
    const cards = await calendarSource(ctx, fetchImpl);
    expect(cards.map((c) => c.title)).toEqual(["Today — Bin day", "Today 2:30pm — Dentist"]);
  });

  it("no calendars, no cards, no fetches", async () => {
    const fetchImpl = (async () => { throw new Error("should not fetch"); }) as unknown as typeof fetch;
    expect(await calendarSource(buildContext(NOW), fetchImpl)).toEqual([]);
  });

  it("doesn't download each calendar on every poll", async () => {
    let fetches = 0;
    const fetchImpl = (async () => { fetches++; return new Response(ics(ev("20261012T133000Z", "Dentist"))); }) as unknown as typeof fetch;
    const ctx = { ...buildContext(NOW), calendars: [mum] };
    const cache = memoryCalendarCache();
    await calendarCardsFor(ctx, fetchImpl, cache);
    const again = await calendarCardsFor({ ...ctx, now: new Date(NOW.getTime() + 60_000) }, fetchImpl, cache);
    expect(fetches).toBe(1);
    expect(again.map((c) => c.title)).toEqual(["Today 2:30pm — Dentist"]);
  });
});

