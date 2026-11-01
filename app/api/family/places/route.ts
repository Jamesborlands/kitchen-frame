// Find a place by name for the family page's Settings. PIN-gated.
import { searchPlaces } from "@/lib/geo/geocode";
import { requireHousehold } from "@/lib/households/request";

export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  const h = await requireHousehold(request);
  if (h instanceof Response) return h;
  return Response.json({ results: await searchPlaces(new URL(request.url).searchParams.get("q") ?? "") });
}
