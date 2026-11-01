import { describe, expect, it } from "vitest";
import { KITCHEN } from "@/lib/config";
import { OCCASIONS } from "@/lib/content/occasions";
import { PHOTO_SLIDE_MS } from "@/lib/kitchen/feed/sections";
import { daysInMonth, defaultSettings, getSettings, normalizeCalendarUrl, patchSettings, sanitizeSettings, saveSettings } from "@/lib/family/settings";

describe("defaultSettings", () => {
  it("starts from the config the frame already uses", () => {
    const d = defaultSettings();
    expect(d.nightStartHour).toBe(KITCHEN.nightStartHour);
    expect(d.nightEndHour).toBe(KITCHEN.nightEndHour);
    expect(d.photoSlideSec).toBe(PHOTO_SLIDE_MS / 1000);
    expect(d.photoFit).toBe(KITCHEN.photoFit);
    expect(d.occasions).toEqual(OCCASIONS);
    expect(d.calendars).toEqual([]);
  });
});

describe("sanitizeSettings", () => {
  it("falls back to defaults for anything missing or not an object", () => {
    expect(sanitizeSettings(null)).toEqual(defaultSettings());
    expect(sanitizeSettings("nope")).toEqual(defaultSettings());
    expect(sanitizeSettings({ photoSlideSec: 30 })).toEqual({ ...defaultSettings(), photoSlideSec: 30 });
  });

  it("clamps numbers into range and rounds them", () => {
    const s = sanitizeSettings({ nightStartHour: 27, nightEndHour: -3, photoSlideSec: 2 });
    expect(s.nightStartHour).toBe(23);
    expect(s.nightEndHour).toBe(0);
    expect(s.photoSlideSec).toBe(5);
    expect(sanitizeSettings({ photoSlideSec: 9999 }).photoSlideSec).toBe(300);
    expect(sanitizeSettings({ nightStartHour: 21.6 }).nightStartHour).toBe(22);
    expect(sanitizeSettings({ nightStartHour: "1" }).nightStartHour).toBe(KITCHEN.nightStartHour);
  });

  it("only accepts known photo fits", () => {
    expect(sanitizeSettings({ photoFit: "whole" }).photoFit).toBe("whole");
    expect(sanitizeSettings({ photoFit: "stretch" }).photoFit).toBe(KITCHEN.photoFit);
  });

  it("keeps good occasions and drops broken ones", () => {
    const s = sanitizeSettings({
      occasions: [
        { name: "  Gran ", month: 3, day: 4, kind: "birthday", year: 1940 },
        { name: "", month: 3, day: 4, kind: "birthday" },
        { name: "x", month: 13, day: 1, kind: "birthday" },
        { name: "x", month: 2, day: 31, kind: "birthday" },
        { name: "x", month: 2, day: 1, kind: "party" },
        { name: "Trip", month: 12, day: 24, kind: "event" },
      ],
    });
    expect(s.occasions).toEqual([
      { name: "Gran", month: 3, day: 4, kind: "birthday", year: 1940 },
      { name: "Trip", month: 12, day: 24, kind: "event" },
    ]);
  });

  it("keeps good calendars, rewriting webcal links, and drops bad ones", () => {
    const s = sanitizeSettings({
      calendars: [
        { id: "a", name: "Mum", url: "webcal://p01-caldav.icloud.com/published/2/abc", color: "#B0607A" },
        { id: "b", name: "Dad", url: "http://example.com/cal.ics", color: "#4E6A8E" },
        { id: "c", name: "", url: "https://x.example/cal.ics", color: "#4E6A8E" },
        { id: "d", name: "Home", url: "https://calendar.google.com/calendar/ical/x/private-y/basic.ics", color: "red" },
      ],
    });
    expect(s.calendars).toEqual([
      { id: "a", name: "Mum", url: "https://p01-caldav.icloud.com/published/2/abc", color: "#B0607A" },
      { id: "d", name: "Home", url: "https://calendar.google.com/calendar/ical/x/private-y/basic.ics", color: "#4E6A8E" },
    ]);
  });

  it("caps list lengths", () => {
    const many = Array.from({ length: 30 }, (_, i) => ({ id: `c${i}`, name: `c${i}`, url: `https://x.example/${i}.ics`, color: "#4E6A8E" }));
    expect(sanitizeSettings({ calendars: many }).calendars).toHaveLength(20);
  });
});

describe("normalizeCalendarUrl", () => {
  it("accepts https and webcal, nothing else", () => {
    expect(normalizeCalendarUrl(" https://a.example/x.ics ")).toBe("https://a.example/x.ics");
    expect(normalizeCalendarUrl("webcal://a.example/x")).toBe("https://a.example/x");
    expect(normalizeCalendarUrl("WEBCAL://a.example/x")).toBe("https://a.example/x");
    expect(normalizeCalendarUrl("http://a.example/x")).toBeNull();
    expect(normalizeCalendarUrl("javascript:alert(1)")).toBeNull();
    expect(normalizeCalendarUrl("not a url")).toBeNull();
    expect(normalizeCalendarUrl(`https://a.example/${"x".repeat(3000)}`)).toBeNull();
  });
});

describe("store", () => {
  it("round-trips through the store, sanitizing on the way in", async () => {
    const saved = await saveSettings({ ...defaultSettings(), photoSlideSec: 1 });
    expect(saved.photoSlideSec).toBe(5);
    expect((await getSettings()).photoSlideSec).toBe(5);
  });
});

describe("patchSettings", () => {
  const base = () => ({ ...defaultSettings(), calendars: [{ id: "c1", name: "Home", url: "https://x.example/h.ics", color: "#4E6A8E" }] });

  it("changes only the fields sent", () => {
    const s = patchSettings(base(), { photoSlideSec: 45 });
    expect(s).toEqual({ ...base(), photoSlideSec: 45 });
  });

  it("adds and removes calendars without touching the rest", () => {
    const added = patchSettings(base(), { addCalendar: { name: "Mum", url: "webcal://p01.icloud.com/x", color: "#B0607A" } });
    expect(added.calendars.map((c) => c.name)).toEqual(["Home", "Mum"]);
    expect(added.calendars[1].url).toBe("https://p01.icloud.com/x");
    expect(added.calendars[1].id).toMatch(/^cal-/);
    expect(patchSettings(added, { removeCalendar: "c1" }).calendars.map((c) => c.name)).toEqual(["Mum"]);
  });

  it("adds and removes a birthday", () => {
    const gran = { name: "Gran", month: 3, day: 4, kind: "birthday" as const };
    const added = patchSettings(base(), { addOccasion: gran });
    expect(added.occasions.at(-1)).toEqual(gran);
    expect(patchSettings(added, { removeOccasion: gran }).occasions).toEqual(base().occasions);
  });

  it("ignores junk", () => {
    expect(patchSettings(base(), { nightStartHour: "late", addCalendar: { name: "x", url: "http://bad" }, removeCalendar: 7 })).toEqual(base());
    expect(patchSettings(base(), null)).toEqual(base());
  });
});

describe("daysInMonth", () => {
  it("knows short months and allows 29 February", () => {
    expect(daysInMonth(2)).toBe(29);
    expect(daysInMonth(4)).toBe(30);
    expect(daysInMonth(12)).toBe(31);
  });
});
