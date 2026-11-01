// The ✕ on a photo on the frame: moves it to the family page's bin (restorable
// for 30 days), exactly like deleting it on the site. FRAME_KEY.
import { frameStore } from "@/lib/households/data";
import { requireHousehold } from "@/lib/households/request";

export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  const h = await requireHousehold(request);
  if (h instanceof Response) return h;
  let id: unknown = null;
  try {
    id = ((await request.json()) as { id?: unknown })?.id;
  } catch {
    // fall through
  }
  if (typeof id !== "string" || !id) return Response.json({ error: "bad request" }, { status: 400 });
  return (await frameStore(h.id).deleteItem("photo", id, Date.now()))
    ? Response.json({ ok: true })
    : Response.json({ error: "not found" }, { status: 404 });
}
