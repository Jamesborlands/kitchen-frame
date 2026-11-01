// "Check it" on /family's calendar form: fetch the link and show the next few
// events, or a plain-English reason it didn't work. PIN-gated.
import { checkCalendar } from "@/lib/family/calendars";

export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  let url: unknown = null;
  try {
    url = ((await request.json()) as { url?: unknown })?.url;
  } catch {
    // fall through
  }
  const r = await checkCalendar(typeof url === "string" ? url : "");
  return Response.json(r.ok ? { ok: true, events: r.events.slice(0, 5) } : r);
}
