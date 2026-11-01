// Adding a to-do on the frame (its on-screen keyboard). FRAME_KEY.
import { householdTodos } from "@/lib/households/data";
import { requireHousehold } from "@/lib/households/request";

export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  const h = await requireHousehold(request);
  if (h instanceof Response) return h;
  let text: unknown = null;
  try {
    text = ((await request.json()) as { text?: unknown })?.text;
  } catch {
    // fall through
  }
  if (typeof text !== "string" || !text.trim()) return Response.json({ error: "bad request" }, { status: 400 });
  const todos = householdTodos(h.id);
  await todos.add(text);
  return Response.json({ ok: true, todos: await todos.list() });
}
