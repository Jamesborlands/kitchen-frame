// Hide/show a photo, or delete/restore a photo or message, from /family. PIN-gated.
import type { ItemKind } from "@/lib/frame/store";
import { frameStore } from "@/lib/households/data";
import { requireHousehold } from "@/lib/households/request";

export const dynamic = "force-dynamic";

const ACTIONS = ["hide", "show", "delete", "restore", "setFrom"] as const;
type Action = (typeof ACTIONS)[number];

export async function POST(request: Request): Promise<Response> {
  const h = await requireHousehold(request);
  if (h instanceof Response) return h;
  const store = frameStore(h.id);
  type Body = { action?: unknown; kind?: unknown; id?: unknown; from?: unknown };
  let body: Body | null = null;
  try {
    body = (await request.json()) as Body;
  } catch {
    // fall through
  }
  const action = body?.action as Action;
  const kind = body?.kind as ItemKind;
  const id = body?.id;
  if (!ACTIONS.includes(action) || (kind !== "photo" && kind !== "note") || typeof id !== "string" || !id) {
    return Response.json({ error: "bad request" }, { status: 400 });
  }
  if ((action === "hide" || action === "show" || action === "setFrom") && kind !== "photo") {
    return Response.json({ error: "only photos" }, { status: 400 });
  }
  if (action === "setFrom" && typeof body?.from !== "string") return Response.json({ error: "bad request" }, { status: 400 });
  const done =
    action === "hide" ? await store.setHidden(id, true)
    : action === "show" ? await store.setHidden(id, false)
    : action === "setFrom" ? await store.setSender(id, body!.from as string)
    : action === "delete" ? await store.deleteItem(kind, id, Date.now())
    : await store.restoreItem(kind, id);
  return done ? Response.json({ ok: true }) : Response.json({ error: "not found" }, { status: 404 });
}
