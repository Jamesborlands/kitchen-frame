// Anything new on the frame? A cheap check the frame makes every 10 seconds. FRAME_KEY.
import { frameStore } from "@/lib/households/data";
import { requireHousehold } from "@/lib/households/request";
import { latestMarker } from "@/lib/kitchen/latest";

export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  const h = await requireHousehold(request);
  if (h instanceof Response) return h;
  return Response.json({ latest: latestMarker(await frameStore(h.id).getFrame(Date.now())) }, { headers: { "cache-control": "no-store" } });
}
