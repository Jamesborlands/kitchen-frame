// Reads a family calendar's private iCal link (Google "secret address in iCal
// format", or an Apple shared-calendar webcal:// link) with a timeout and a size
// cap, and turns every way it can go wrong into a sentence a parent can act on.
import { parseCalendar, type CalEvent } from "@/lib/sources/calendar";
import { normalizeCalendarUrl } from "@/lib/family/settings";

export const MAX_ICS_BYTES = 2 * 1024 * 1024;
const TIMEOUT_MS = 5000;

export type CalendarCheck = { ok: true; events: CalEvent[] } | { ok: false; error: string };

const BAD_LINK = "That doesn't look like a calendar link. It should start with https:// or webcal://";
const UNREACHABLE = "Couldn't reach that calendar just now. Check the link, or try again in a minute.";
const REFUSED = "Couldn't open that calendar — the link may have been reset, or the calendar isn't public/shared. Copy the link again.";
const NOT_ICS = "That link opens a web page, not a calendar. Use the private iCal / public calendar link from the steps below.";
const TOO_BIG = "That calendar is too big to show (over 2 MB). Try a smaller calendar.";

async function readCapped(res: Response): Promise<string | null> {
  if (!res.body) return (await res.text()).slice(0, MAX_ICS_BYTES + 1);
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_ICS_BYTES) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  const all = new Uint8Array(size);
  let at = 0;
  for (const c of chunks) { all.set(c, at); at += c.byteLength; }
  return new TextDecoder().decode(all);
}

/** Fetch and parse a calendar link; events in the next `windowDays` days. */
export async function checkCalendar(
  rawUrl: string,
  now: Date = new Date(),
  fetchImpl: typeof fetch = fetch,
  windowDays = 14,
  limit = 20,
): Promise<CalendarCheck> {
  const url = normalizeCalendarUrl(rawUrl);
  if (!url) return { ok: false, error: BAD_LINK };
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), TIMEOUT_MS);
  try {
    let res: Response;
    try {
      res = await fetchImpl(url, { signal: ctl.signal, redirect: "follow" });
    } catch {
      return { ok: false, error: UNREACHABLE };
    }
    if (!res.ok) return { ok: false, error: REFUSED };
    const text = await readCapped(res).catch(() => undefined);
    if (text === undefined) return { ok: false, error: UNREACHABLE };
    if (text === null) return { ok: false, error: TOO_BIG };
    if (!text.includes("BEGIN:VCALENDAR")) return { ok: false, error: NOT_ICS };
    return { ok: true, events: parseCalendar(text, now, windowDays, limit) };
  } finally {
    clearTimeout(timer);
  }
}
