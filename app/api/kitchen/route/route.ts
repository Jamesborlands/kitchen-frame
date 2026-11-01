// A ready-made ride/walk's line for the frame's map: fetched from BRouter once,
// thinned to at most 400 points, and kept in R2 (routes don't change). FRAME_KEY.
import { bindings } from "@/lib/cloudflare/bindings";
import { PREMADE_ROUTES } from "@/lib/map/routes";
import { requireHousehold } from "@/lib/households/request";

export const dynamic = "force-dynamic";
const MAX_POINTS = 400;

export interface RouteLine { name: string; distanceKm: number; ascentM: number; points: [number, number][]; bbox: [number, number, number, number] }

async function fromBRouter(id: number): Promise<RouteLine | null> {
  const r = PREMADE_ROUTES[id];
  const lonlats = r.waypoints.map(([lat, lng]) => `${lng},${lat}`).join("|");
  const res = await fetch(`https://brouter.de/brouter?lonlats=${lonlats}&profile=${r.profile}&alternativeidx=0&format=geojson`);
  if (!res.ok) return null;
  const f = ((await res.json()) as { features?: { geometry: { coordinates: number[][] }; properties: Record<string, string | number> }[] }).features?.[0];
  if (!f) return null;
  const all = f.geometry.coordinates;
  // every step-th point plus the last: the start and finish are always kept
  const step = Math.max(1, Math.ceil((all.length - 1) / (MAX_POINTS - 1)));
  const points = all.filter((_, i) => i % step === 0 || i === all.length - 1)
    .map((c): [number, number] => [Math.round(c[1] * 1e5) / 1e5, Math.round(c[0] * 1e5) / 1e5]);
  const lats = all.map((c) => c[1]), lons = all.map((c) => c[0]);
  return {
    name: r.name,
    distanceKm: Math.round(Number(f.properties["track-length"]) / 100) / 10,
    ascentM: Math.round(Number(f.properties["filtered ascend"])),
    points,
    bbox: [Math.min(...lats), Math.min(...lons), Math.max(...lats), Math.max(...lons)],
  };
}

export async function GET(request: Request): Promise<Response> {
  const h = await requireHousehold(request);
  if (h instanceof Response) return h;
  const id = Number(new URL(request.url).searchParams.get("id"));
  if (!Number.isInteger(id) || id < 0 || id >= PREMADE_ROUTES.length) return Response.json({ error: "no such route" }, { status: 404 });
  const bucket = bindings().PHOTOS;
  const key = `routes/v1/${id}.json`;
  const kept = await bucket?.get(key);
  if (kept && "text" in kept) return new Response(await (kept as { text(): Promise<string> }).text(), { headers: { "content-type": "application/json" } });
  const line = await fromBRouter(id).catch(() => null);
  if (!line) return Response.json({ error: "route service unavailable" }, { status: 502 });
  const json = JSON.stringify(line);
  await bucket?.put(key, new TextEncoder().encode(json).buffer as ArrayBuffer, { httpMetadata: { contentType: "application/json" } });
  return new Response(json, { headers: { "content-type": "application/json" } });
}
