// Calendars change slowly but the frame polls its feed every minute: keep each
// calendar's parsed events for 15 minutes (KV when bound, else memory), so a
// calendar is downloaded and parsed ~100 times a day, not 1,440. If a reload
// fails, the last good events keep showing for up to a day, and the failure
// itself is remembered so a broken link isn't retried on every poll.
import { bindings } from "@/lib/cloudflare/bindings";
import type { CalEvent } from "@/lib/sources/calendar";

export const FRESH_MS = 15 * 60_000;
export const STALE_OK_MS = 24 * 60 * 60_000;

interface Entry { checkedAt: number; okAt: number; events: CalEvent[] }

export interface CalendarCache {
  get(key: string): Promise<Entry | null>;
  set(key: string, e: Entry): Promise<void>;
}

export function memoryCalendarCache(): CalendarCache {
  const m = new Map<string, Entry>();
  return { get: async (k) => m.get(k) ?? null, set: async (k, e) => { m.set(k, e); } };
}

const shared = memoryCalendarCache();

export function defaultCalendarCache(): CalendarCache {
  const kv = bindings().FRAME;
  if (!kv) return shared;
  return {
    get: async (k) => ((await kv.get(k, "json")) as Entry | null) ?? null,
    set: async (k, e) => { await kv.put(k, JSON.stringify(e)); },
  };
}

async function keyFor(url: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(url));
  return `calendar:${Array.from(new Uint8Array(digest).slice(0, 16), (b) => b.toString(16).padStart(2, "0")).join("")}`;
}

/** Events for one calendar link; `load` returns null when the calendar couldn't be read. */
export async function cachedEvents(
  url: string,
  now: number,
  load: () => Promise<CalEvent[] | null>,
  cache: CalendarCache = defaultCalendarCache(),
): Promise<CalEvent[]> {
  const key = await keyFor(url);
  const old = await cache.get(key).catch(() => null);
  const usable = (e: Entry | null) => (e && now - e.okAt <= STALE_OK_MS ? e.events : []);
  if (old && now - old.checkedAt < FRESH_MS) return usable(old);

  const events = await load().catch(() => null);
  const next: Entry = events
    ? { checkedAt: now, okAt: now, events }
    : { checkedAt: now, okAt: old?.okAt ?? 0, events: old?.events ?? [] };
  await cache.set(key, next).catch(() => undefined);
  return usable(next);
}
