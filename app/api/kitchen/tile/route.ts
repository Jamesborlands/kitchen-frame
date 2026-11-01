// Map tiles for the frame's ride map: OpenStreetMap's, fetched once each and
// kept in R2, so one frame never leans on their servers. FRAME_KEY.
import { bindings } from "@/lib/cloudflare/bindings";
import { requireHousehold } from "@/lib/households/request";

export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  const h = await requireHousehold(request);
  if (h instanceof Response) return h;
  const q = new URL(request.url).searchParams;
  const [z, x, y] = ["z", "x", "y"].map((k) => Number(q.get(k)));
  const n = 2 ** z;
  if (![z, x, y].every(Number.isInteger) || z < 3 || z > 17 || x < 0 || y < 0 || x >= n || y >= n) {
    return new Response("bad tile", { status: 400 });
  }
  const headers = { "content-type": "image/png", "cache-control": "private, max-age=2592000" };
  const bucket = bindings().PHOTOS;
  const key = `tiles/osm/${z}/${x}/${y}.png`;
  const kept = await bucket?.get(key);
  if (kept) return new Response(kept.body, { headers });
  const res = await fetch(`https://tile.openstreetmap.org/${z}/${x}/${y}.png`, {
    headers: { "user-agent": "cottage-view-kitchen-frame/1.0 (+https://cottage-view.example.workers.dev)" },
  });
  if (!res.ok) return new Response("tile unavailable", { status: 502 });
  const bytes = await res.arrayBuffer();
  await bucket?.put(key, bytes, { httpMetadata: { contentType: "image/png" } });
  return new Response(bytes, { headers });
}
