// The one endpoint the kitchen frame app polls (every 60s): a ready-to-draw
// snapshot of everything on its household's kitchen screen. The frame's key
// picks the household. Always 200 for a known frame — sections that fail come back null/empty.
import { buildFeed, type FeedDeps } from "@/lib/kitchen/feed/build";
import { familyWeather } from "@/lib/kitchen/feed/weatherCache";
import { loveEnabled } from "@/lib/frame/love";
import { fetchWarnings } from "@/lib/sources/warnings";
import { aggregateNotices } from "@/lib/notice/aggregate";
import { buildContext } from "@/lib/notice/card";
import { buildToday } from "@/lib/kitchen/feed/today";
import { calendarItemsFor } from "@/lib/notice/sources/calendar";
import { getRelease } from "@/lib/kitchen/release";
import { frameStore, householdLoveConfig, householdSettings, householdTodos } from "@/lib/households/data";
import { displayNumber, shareSection } from "@/lib/kitchen/share";
import { latestMarker } from "@/lib/kitchen/latest";
import { requireHousehold } from "@/lib/households/request";

export const dynamic = "force-dynamic";

function deps(h: string, loveOn: boolean): FeedDeps {
  return {
    weather: (loc, now) => familyWeather(loc, now),
    warnings: () => fetchWarnings(),
    notices: (now, s) => aggregateNotices({ ...buildContext(now), occasions: s.occasions, calendars: s.calendars }),
    frame: (now) => frameStore(h).getFrame(now),
    release: () => getRelease(),
    serverVersion: process.env.APP_VERSION || null,
    settings: () => householdSettings(h),
    loveOn,
    today: async (now, s) => buildToday({ now, timeZone: s.home.timezone, reminders: s.reminders, occasions: s.occasions, calendar: await calendarItemsFor(s.calendars, now) }),
    todos: () => householdTodos(h).list(),
  };
}

export async function GET(request: Request = new Request("http://local/")): Promise<Response> {
  const h = await requireHousehold(request);
  if (h instanceof Response) return h;
  const love = await householdLoveConfig(h.id);
  // the marker first: anything that lands while the feed is built shows up as new at the next check
  const latest = await frameStore(h.id).getFrame(Date.now()).then(latestMarker).catch(() => null);
  const [feed, share] = await Promise.all([
    buildFeed(deps(h.id, loveEnabled(love)), new Date()),
    // the Settings panel: the family page (as a QR code) and the number to send photos to
    shareSection(new URL(request.url).origin, love.phoneNumberId ?? null, displayNumber).catch(() => null),
  ]);
  return Response.json({ ...feed, share, latest }, { headers: { "cache-control": "no-store" } });
}
