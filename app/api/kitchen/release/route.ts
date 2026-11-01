// The latest kitchen-frame app build's metadata. FRAME_KEY-gated.
import { getRelease } from "@/lib/kitchen/release";
import { requireHousehold } from "@/lib/households/request";

export const dynamic = "force-dynamic";

export async function GET(request: Request = new Request("http://local/")): Promise<Response> {
  const h = await requireHousehold(request);
  if (h instanceof Response) return h;
  const r = await getRelease();
  if (!r) return Response.json({ error: "no release" }, { status: 404 });
  return Response.json(r, { headers: { "cache-control": "no-store" } });
}
