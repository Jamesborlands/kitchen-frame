// The frame's 10-minute check-in: how it is, and any command waiting for it. FRAME_KEY.
import { parseCheckin, recordCheckin, takeCommand } from "@/lib/kitchen/ops";
import { requireHousehold } from "@/lib/households/request";

export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  const h = await requireHousehold(request);
  if (h instanceof Response) return h;
  let body: unknown = null;
  try {
    body = await request.json();
  } catch {
    // fall through
  }
  const c = parseCheckin(body);
  if (!c) return Response.json({ error: "bad checkin" }, { status: 400 });
  await recordCheckin(c, Date.now(), h.id);
  return Response.json({ command: await takeCommand(h.id) }, { headers: { "cache-control": "no-store" } });
}
