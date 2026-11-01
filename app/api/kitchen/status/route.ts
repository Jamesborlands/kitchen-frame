// The household's frame at a glance for /kitchen/status. PIN-gated.
import { debugMeta, latestCheckin, peekCommand } from "@/lib/kitchen/ops";
import { requireHousehold } from "@/lib/households/request";

export const dynamic = "force-dynamic";

export async function GET(request: Request = new Request("http://local/")): Promise<Response> {
  const h = await requireHousehold(request);
  if (h instanceof Response) return h;
  const [checkin, pendingCommand, debug] = await Promise.all([latestCheckin(h.id), peekCommand(h.id), debugMeta(h.id)]);
  return Response.json({ checkin, pendingCommand, debug }, { headers: { "cache-control": "no-store" } });
}
