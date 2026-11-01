// "❤️ Send a heart" — shared by the web /kitchen (PIN) and the frame (FRAME_KEY).
import type { Backend } from "@/lib/frame/store";
import { frameStore, householdLoveConfig } from "@/lib/households/data";
import { requireHousehold } from "@/lib/households/request";
import { canLove, loveEnabled, sendLove } from "@/lib/frame/love";

export type LoveResult = { status: number; body: { ok: boolean; reason?: string } };

export async function loveFromKitchen(
  id: unknown, now: number = Date.now(), store: Backend = frameStore("ludlow"), household = "ludlow",
): Promise<LoveResult> {
  const cfg = await householdLoveConfig(household);
  if (!loveEnabled(cfg)) return { status: 503, body: { ok: false, reason: "not-configured" } };
  if (typeof id !== "string") return { status: 400, body: { ok: false, reason: "bad-request" } };
  const photo = (await store.getFrame(now)).photos.find((p) => p.id === id);
  if (!photo) return { status: 404, body: { ok: false, reason: "not-found" } };
  if (!canLove(photo, now)) return { status: 409, body: { ok: false, reason: "not-lovable" } };
  try {
    if (!(await sendLove(photo, cfg))) return { status: 502, body: { ok: false, reason: "whatsapp-refused" } };
  } catch {
    return { status: 502, body: { ok: false, reason: "whatsapp-unreachable" } };
  }
  await store.markLoved(photo.id, now);
  return { status: 200, body: { ok: true } };
}

export async function lovePost(request: Request): Promise<Response> {
  const h = await requireHousehold(request);
  if (h instanceof Response) return h;
  let id: unknown;
  try {
    ({ id } = (await request.json()) as { id?: unknown });
  } catch {
    return Response.json({ ok: false, reason: "bad-request" }, { status: 400 });
  }
  const r = await loveFromKitchen(id, Date.now(), frameStore(h.id), h.id);
  return Response.json(r.body, { status: r.status });
}
