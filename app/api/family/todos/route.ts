// The household's to-do list from the family page: add, tick, remove. PIN-gated.
import { householdTodos } from "@/lib/households/data";
import { requireHousehold } from "@/lib/households/request";

export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  const h = await requireHousehold(request);
  if (h instanceof Response) return h;
  type Body = { action?: unknown; text?: unknown; id?: unknown };
  let b: Body | null = null;
  try {
    b = (await request.json()) as Body;
  } catch {
    return Response.json({ error: "bad request" }, { status: 400 });
  }
  const todos = householdTodos(h.id);
  if (b?.action === "add" && typeof b.text === "string") await todos.add(b.text);
  else if (b?.action === "toggle" && typeof b.id === "string") await todos.toggle(b.id);
  else if (b?.action === "remove" && typeof b.id === "string") await todos.remove(b.id);
  else return Response.json({ error: "bad request" }, { status: 400 });
  return Response.json({ todos: await todos.list() });
}
