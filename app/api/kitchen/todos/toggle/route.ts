// Ticking a to-do on the frame (and un-ticking a mis-tap). FRAME_KEY.
import { householdTodos } from "@/lib/households/data";
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
  if (typeof id !== "string") return Response.json({ error: "bad request" }, { status: 400 });
  return (await householdTodos(h.id).toggle(id))
    ? Response.json({ ok: true })
    : Response.json({ error: "not found" }, { status: 404 });
}
