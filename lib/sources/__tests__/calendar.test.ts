import { describe, it, expect, vi, beforeEach } from "vitest";
import { parseCalendar, fetchCalendar } from "@/lib/sources/calendar";
import { readFileSync } from "fs";
import { join } from "path";

const ics = readFileSync(join(__dirname, "../__fixtures__/calendar.ics"), "utf-8");
const NOW = new Date("2026-06-25T08:00:00Z"); // Thursday

describe("parseCalendar", () => {
  it("returns upcoming events, expands a weekly recurrence, drops past ones", () => {
    const events = parseCalendar(ics, NOW, 14);
    const titles = events.map((e) => e.title);
    // Bin collection 26 Jun (all-day), pickleball next Tuesdays 30 Jun & 7 Jul.
    // 'Past meeting' (20 Jun) is excluded; the 23 Jun pickleball is before NOW.
    expect(titles).toEqual(["Bin collection - recycling", "Anne's pickleball", "Anne's pickleball"]);
  });

  it("marks the all-day event as allDay and the class as timed with a location", () => {
    const events = parseCalendar(ics, NOW, 14);
    const bin = events.find((e) => e.title.startsWith("Bin"))!;
    const pick = events.find((e) => e.title.includes("pickleball"))!;
    expect(bin.allDay).toBe(true);
    expect(pick.allDay).toBe(false);
    expect(pick.location).toBe("Ludlow Leisure Centre");
    expect(pick.start).toBe("2026-06-30T10:00:00.000Z");
  });

  it("respects the window — a 1-day window only keeps tomorrow's bin day", () => {
    const events = parseCalendar(ics, NOW, 2);
    expect(events.map((e) => e.title)).toEqual(["Bin collection - recycling"]);
  });

  it("returns [] on garbage", () => {
    expect(parseCalendar("not an ical", NOW)).toEqual([]);
    expect(parseCalendar("", NOW)).toEqual([]);
  });
});

describe("fetchCalendar", () => {
  beforeEach(() => vi.resetAllMocks());

  it("fetches the feed and parses upcoming events", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true, text: async () => ics });
    const events = await fetchCalendar("https://example.com/cal.ics", NOW, fetchImpl as unknown as typeof fetch);
    expect(events[0].title).toBe("Bin collection - recycling");
  });

  it("throws on a non-ok response", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: false, status: 404 });
    await expect(
      fetchCalendar("https://example.com/cal.ics", NOW, fetchImpl as unknown as typeof fetch),
    ).rejects.toThrow();
  });
});

describe("parseCalendar — real-world recurrences", () => {
  const wrap = (body: string) => `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:t\r\n${body}END:VCALENDAR\r\n`;
  const at = new Date("2026-10-12T08:00:00Z");

  it("keeps a daily event that started years ago", () => {
    const cal = wrap("BEGIN:VEVENT\r\nUID:pills\r\nDTSTAMP:20200101T000000Z\r\nDTSTART:20200101T180000Z\r\nRRULE:FREQ=DAILY\r\nSUMMARY:Pills\r\nEND:VEVENT\r\n");
    const events = parseCalendar(cal, at, 2);
    expect(events.map((e) => e.start)).toEqual(["2026-10-12T18:00:00.000Z", "2026-10-13T18:00:00.000Z"]);
  });

  it("a moved occurrence shows once, at its new time", () => {
    const cal = wrap(
      "BEGIN:VEVENT\r\nUID:yoga\r\nDTSTAMP:20260101T000000Z\r\nDTSTART:20260105T100000Z\r\nDTEND:20260105T110000Z\r\nRRULE:FREQ=WEEKLY\r\nSUMMARY:Yoga\r\nEND:VEVENT\r\n" +
      "BEGIN:VEVENT\r\nUID:yoga\r\nDTSTAMP:20260101T000000Z\r\nRECURRENCE-ID:20261012T100000Z\r\nDTSTART:20261013T110000Z\r\nDTEND:20261013T120000Z\r\nSUMMARY:Yoga\r\nEND:VEVENT\r\n",
    );
    const events = parseCalendar(cal, at, 2);
    expect(events.map((e) => [e.title, e.start, e.end])).toEqual([["Yoga", "2026-10-13T11:00:00.000Z", "2026-10-13T12:00:00.000Z"]]);
  });

  it("drops cancelled events", () => {
    const cal = wrap("BEGIN:VEVENT\r\nUID:c\r\nDTSTAMP:20260101T000000Z\r\nDTSTART:20261012T150000Z\r\nSTATUS:CANCELLED\r\nSUMMARY:Off\r\nEND:VEVENT\r\n");
    expect(parseCalendar(cal, at, 2)).toEqual([]);
  });
});
