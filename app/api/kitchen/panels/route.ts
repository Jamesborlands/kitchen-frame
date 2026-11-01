// What the frame's tap-to-open panels draw (lib/kitchen/panels). FRAME_KEY.
// Always 200 — a dead source costs only its own lines.
import { buildPanels } from "@/lib/kitchen/panels/build";
import { familyWeather } from "@/lib/kitchen/feed/weatherCache";
import { fetchTides } from "@/lib/sources/tides";
import { fetchWaves } from "@/lib/sources/waves";
import { fetchSnow } from "@/lib/sources/snow";
import { frameStore, householdSettings } from "@/lib/households/data";
import { requireHousehold } from "@/lib/households/request";
import { buildAgenda } from "@/lib/kitchen/feed/today";
import { calendarItemsFor } from "@/lib/notice/sources/calendar";

export const dynamic = "force-dynamic";

// a tide station's days are its own place's days
const ymd = (d: Date, timeZone: string) => new Intl.DateTimeFormat("en-CA", { timeZone }).format(d).replace(/-/g, "");

export async function GET(request: Request = new Request("http://local/")): Promise<Response> {
  const h = await requireHousehold(request);
  if (h instanceof Response) return h;
  const now = new Date();
  const settings = () => householdSettings(h.id);
  const panels = await buildPanels({
    weather: (loc, t) => familyWeather(loc, t),
    tides: (station, tz) => fetchTides(station, ymd(now, tz), ymd(new Date(now.getTime() + 2 * 86_400_000), tz)),
    waves: (buoy) => fetchWaves(buoy),
    snow: (loc) => fetchSnow(loc.latitude, loc.longitude, loc.timezone),
    notes: async () => (await frameStore(h.id).getFrame(now.getTime())).notes,
    settings,
    agenda: async (at) => {
      const s = await settings();
      return buildAgenda({ now: at, timeZone: s.home.timezone, days: 14, reminders: s.reminders, occasions: s.occasions, calendar: await calendarItemsFor(s.calendars, at) });
    },
  }, now);
  return Response.json(panels, { headers: { "cache-control": "no-store" } });
}
