// The frame's full calendar (month and week views): every day in a stretch,
// with reminders, birthdays and the household's calendars. FRAME_KEY.
import { buildRange } from "@/lib/kitchen/feed/today";
import { calendarItemsFor } from "@/lib/notice/sources/calendar";
import { householdSettings } from "@/lib/households/data";
import { requireHousehold } from "@/lib/households/request";

export const dynamic = "force-dynamic";
const MAX_DAYS = 42; // a month grid: six weeks

export async function GET(request: Request): Promise<Response> {
  const h = await requireHousehold(request);
  if (h instanceof Response) return h;
  const q = new URL(request.url).searchParams;
  const from = q.get("from") ?? "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || Number.isNaN(Date.parse(`${from}T00:00:00Z`))) return Response.json({ error: "bad from" }, { status: 400 });
  const days = Math.max(1, Math.min(MAX_DAYS, Number(q.get("days")) || 7));
  const s = await householdSettings(h.id);
  // a day either side, so events near midnight in the household's zone are caught
  const start = new Date(Date.parse(`${from}T00:00:00Z`) - 86_400_000);
  const calendar = await calendarItemsFor(s.calendars, new Date(), fetch, undefined, { from: start, days: days + 2 }).catch(() => []);
  return Response.json(
    { from, days: buildRange({ from, days, reminders: s.reminders, occasions: s.occasions, calendar, timeZone: s.home.timezone }) },
    { headers: { "cache-control": "no-store" } },
  );
}
