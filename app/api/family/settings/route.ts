// Change one family-page setting for the household (a field, or add/remove one
// calendar, birthday or reminder). Merged into the saved record server-side, so
// two people editing at once don't undo each other, and sanitized. PIN-gated.
import { patchHousehold } from "@/lib/households/data";
import { requireHousehold } from "@/lib/households/request";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request): Promise<Response> {
  const h = await requireHousehold(request);
  if (h instanceof Response) return h;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "bad request" }, { status: 400 });
  }
  return Response.json(await patchHousehold(h.id, body));
}
