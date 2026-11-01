// Everything the family page shows for its household: photos (hidden ones too),
// live messages, the bin, the who-sent-what log, settings, to-dos, and when the
// frame last checked in. PIN-gated. Also the cheap moment to purge the bin.
import { bindings } from "@/lib/cloudflare/bindings";
import type { FramePhoto } from "@/lib/frame/store";
import { latestCheckin } from "@/lib/kitchen/ops";
import { frameStore, householdSettings, householdTodos } from "@/lib/households/data";
import { requireHousehold } from "@/lib/households/request";

export const dynamic = "force-dynamic";

// WhatsApp numbers and message ids are server-only (they let the kitchen ❤️ a message)
const forBrowser = (p: FramePhoto): FramePhoto => {
  const out = { ...p };
  delete out.waFrom;
  delete out.waMessageId;
  return out;
};

export async function GET(request: Request = new Request("http://local/")): Promise<Response> {
  const h = await requireHousehold(request);
  if (h instanceof Response) return h;
  const now = Date.now();
  const store = frameStore(h.id);
  const expired = await store.purgeTrash(now).catch(() => [] as string[]);
  const bucket = bindings().PHOTOS;
  if (bucket?.delete) await Promise.all(expired.map((k) => bucket.delete!(k).catch(() => undefined)));

  const [admin, settings, checkin, todos] = await Promise.all([
    store.getAdmin(now), householdSettings(h.id), latestCheckin(h.id).catch(() => null), householdTodos(h.id).list(now).catch(() => []),
  ]);
  return Response.json({
    household: h.id,
    photos: admin.photos.map(forBrowser),
    notes: admin.notes,
    trash: admin.trash.map((t) => (t.kind === "photo" ? { ...t, item: forBrowser(t.item) } : t)),
    log: admin.log,
    settings,
    todos,
    frameLastSeen: checkin?.at ?? null,
  });
}
