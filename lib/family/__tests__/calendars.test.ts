import { describe, expect, it } from "vitest";
import { checkCalendar, MAX_ICS_BYTES } from "@/lib/family/calendars";

const NOW = new Date("2026-10-12T09:00:00Z");
const ics = (events: string) => `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:test\r\n${events}END:VCALENDAR\r\n`;
const ev = (uid: string, start: string, summary: string) =>
  `BEGIN:VEVENT\r\nUID:${uid}\r\nDTSTAMP:20261001T000000Z\r\nDTSTART:${start}\r\nDTEND:${start}\r\nSUMMARY:${summary}\r\nEND:VEVENT\r\n`;
const respond = (body: string, init: ResponseInit = {}) => (async () => new Response(body, init)) as unknown as typeof fetch;

describe("checkCalendar", () => {
  it("returns upcoming events from a good feed", async () => {
    const r = await checkCalendar("https://cal.example/x.ics", NOW, respond(ics(ev("1", "20261012T143000Z", "Dentist") + ev("2", "20261013T100000Z", "Golf"))));
    expect(r).toEqual({ ok: true, events: [
      expect.objectContaining({ title: "Dentist", start: "2026-10-12T14:30:00.000Z" }),
      expect.objectContaining({ title: "Golf" }),
    ] });
  });

  it("says plainly when the link is wrong", async () => {
    expect(await checkCalendar("http://cal.example/x.ics", NOW, respond("")))
      .toEqual({ ok: false, error: "That doesn't look like a calendar link. It should start with https:// or webcal://" });
  });

  it("says plainly when the calendar refuses (private link reset, or not shared)", async () => {
    const r = await checkCalendar("https://cal.example/x.ics", NOW, respond("nope", { status: 404 }));
    expect(r.ok).toBe(false);
    expect(!r.ok && r.error).toMatch(/couldn't open that calendar/i);
  });

  it("spots a web page instead of a calendar", async () => {
    const r = await checkCalendar("https://cal.example/x", NOW, respond("<!doctype html><html>sign in</html>"));
    expect(!r.ok && r.error).toMatch(/web page, not a calendar/i);
  });

  it("refuses something enormous", async () => {
    const r = await checkCalendar("https://cal.example/x.ics", NOW, respond("BEGIN:VCALENDAR" + "x".repeat(MAX_ICS_BYTES)));
    expect(!r.ok && r.error).toMatch(/too big/i);
  });

  it("an empty but valid calendar is fine", async () => {
    expect(await checkCalendar("webcal://cal.example/x", NOW, respond(ics("")))).toEqual({ ok: true, events: [] });
  });

  it("network failure", async () => {
    const boom = (async () => { throw new Error("dns"); }) as unknown as typeof fetch;
    const r = await checkCalendar("https://cal.example/x.ics", NOW, boom);
    expect(!r.ok && r.error).toMatch(/couldn't reach/i);
  });
});
