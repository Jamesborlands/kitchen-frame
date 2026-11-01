import { fetchCalendar } from "@/lib/sources/calendar";

export const revalidate = 900; // 15 min

export async function GET(): Promise<Response> {
  const url = process.env.CALENDAR_ICAL_URL;
  if (!url) return Response.json([]); // not configured yet — sections stay hidden
  try {
    // 30-day window so the homepage teaser and the /calendar page share one feed
    return Response.json(await fetchCalendar(url, new Date(), fetch, 30, 40));
  } catch {
    return Response.json([], { status: 502 });
  }
}
