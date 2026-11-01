// The household frame's latest screenshot or logs, for /kitchen/status. PIN-gated.
import { bindings } from "@/lib/cloudflare/bindings";
import { DEBUG_KEYS, debugKey } from "@/lib/kitchen/ops";
import { requireHousehold } from "@/lib/households/request";

export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  const h = await requireHousehold(request);
  if (h instanceof Response) return h;
  const kind = new URL(request.url).searchParams.get("kind");
  if (kind !== "screenshot" && kind !== "logs") return new Response("bad kind", { status: 400 });
  const obj = await bindings().PHOTOS?.get(debugKey(kind, h.id));
  if (!obj) return new Response("not found", { status: 404 });
  return new Response(obj.body, {
    headers: { "content-type": DEBUG_KEYS[kind].contentType, "cache-control": "no-store" },
  });
}
