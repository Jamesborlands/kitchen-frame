// Queue a remote command for the household's frame from /kitchen/status. PIN-gated.
import { isCommand, queueCommand } from "@/lib/kitchen/ops";
import { requireHousehold } from "@/lib/households/request";

export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  const h = await requireHousehold(request);
  if (h instanceof Response) return h;
  let cmd: unknown = null;
  try {
    cmd = ((await request.json()) as { command?: unknown })?.command;
  } catch {
    // fall through
  }
  if (!isCommand(cmd)) return Response.json({ error: "unknown command" }, { status: 400 });
  await queueCommand(cmd, h.id);
  return Response.json({ ok: true });
}
