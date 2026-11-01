import { describe, expect, it, vi } from "vitest";
import { cachedEvents, FRESH_MS, STALE_OK_MS, memoryCalendarCache } from "@/lib/family/calendarCache";

const ev = (title: string) => ({ title, start: "2026-10-12T14:00:00.000Z", allDay: false });
const T = 1_800_000_000_000;

describe("cachedEvents", () => {
  it("loads once, then serves from the cache while fresh", async () => {
    const cache = memoryCalendarCache();
    const load = vi.fn(async () => [ev("a")]);
    expect(await cachedEvents("https://x/1.ics", T, load, cache)).toEqual([ev("a")]);
    expect(await cachedEvents("https://x/1.ics", T + FRESH_MS - 1, load, cache)).toEqual([ev("a")]);
    expect(load).toHaveBeenCalledTimes(1);
  });

  it("reloads once stale", async () => {
    const cache = memoryCalendarCache();
    const load = vi.fn().mockResolvedValueOnce([ev("a")]).mockResolvedValueOnce([ev("b")]);
    await cachedEvents("https://x/1.ics", T, load, cache);
    expect(await cachedEvents("https://x/1.ics", T + FRESH_MS, load, cache)).toEqual([ev("b")]);
  });

  it("keeps showing the last good events when a reload fails, for up to a day", async () => {
    const cache = memoryCalendarCache();
    const load = vi.fn().mockResolvedValueOnce([ev("a")]).mockResolvedValue(null);
    await cachedEvents("https://x/1.ics", T, load, cache);
    expect(await cachedEvents("https://x/1.ics", T + FRESH_MS + 1, load, cache)).toEqual([ev("a")]);
    expect(await cachedEvents("https://x/1.ics", T + STALE_OK_MS + 1, load, cache)).toEqual([]);
  });

  it("a failed reload doesn't retry on every poll", async () => {
    const cache = memoryCalendarCache();
    const load = vi.fn().mockResolvedValueOnce([ev("a")]).mockResolvedValue(null);
    await cachedEvents("https://x/1.ics", T, load, cache);
    await cachedEvents("https://x/1.ics", T + FRESH_MS + 1, load, cache);
    await cachedEvents("https://x/1.ics", T + FRESH_MS + 2, load, cache);
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("calendars are cached separately", async () => {
    const cache = memoryCalendarCache();
    const load = vi.fn(async () => [ev("a")]);
    await cachedEvents("https://x/1.ics", T, load, cache);
    await cachedEvents("https://x/2.ics", T, load, cache);
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("a cache that throws just means loading every time", async () => {
    const broken = { get: async () => { throw new Error("kv"); }, set: async () => { throw new Error("kv"); } };
    expect(await cachedEvents("https://x/1.ics", T, async () => [ev("a")], broken)).toEqual([ev("a")]);
  });
});
