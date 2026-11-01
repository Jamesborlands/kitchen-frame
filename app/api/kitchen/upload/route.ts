// The frame uploads a screenshot or its logs (after a remote command). FRAME_KEY.
import { bindings } from "@/lib/cloudflare/bindings";
import { DEBUG_KEYS, MAX_UPLOAD_BYTES, debugKey, noteDebugUpload, type DebugKind } from "@/lib/kitchen/ops";
import { requireHousehold } from "@/lib/households/request";

export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  const h = await requireHousehold(request);
  if (h instanceof Response) return h;
  const kind = new URL(request.url).searchParams.get("kind");
  if (kind !== "screenshot" && kind !== "logs") return Response.json({ error: "bad kind" }, { status: 400 });
  const bytes = await request.arrayBuffer();
  if (bytes.byteLength > MAX_UPLOAD_BYTES) return Response.json({ error: "too big" }, { status: 413 });
  const bucket = bindings().PHOTOS;
  if (!bucket) return Response.json({ error: "not configured" }, { status: 502 });
  await bucket.put(debugKey(kind as DebugKind, h.id), bytes, { httpMetadata: { contentType: DEBUG_KEYS[kind as DebugKind].contentType } });
  await noteDebugUpload(kind, Date.now(), h.id);
  return Response.json({ ok: true });
}
