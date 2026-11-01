// Every photo the frame should show (the feed carries only the newest few, plus
// photosVersion — the frame fetches this when that version changes). FRAME_KEY.
import { photosSection, photosVersion } from "@/lib/kitchen/feed/sections";
import { loveEnabled } from "@/lib/frame/love";
import { frameStore, householdLoveConfig } from "@/lib/households/data";
import { requireHousehold } from "@/lib/households/request";

export const dynamic = "force-dynamic";

export async function GET(request: Request = new Request("http://local/")): Promise<Response> {
  const h = await requireHousehold(request);
  if (h instanceof Response) return h;
  const photos = photosSection(await frameStore(h.id).getFrame(Date.now()), loveEnabled(await householdLoveConfig(h.id)));
  return Response.json({ version: await photosVersion(photos), photos }, { headers: { "cache-control": "no-store" } });
}
