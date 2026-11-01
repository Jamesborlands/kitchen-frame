// The web /kitchen's photos and notes (PIN-gated), for its household.
import { loveEnabled, toPhotoView } from "@/lib/frame/love";
import { frameStore, householdLoveConfig } from "@/lib/households/data";
import { requireHousehold } from "@/lib/households/request";

export const dynamic = "force-dynamic";

export async function GET(request: Request = new Request("http://local/")): Promise<Response> {
  const h = await requireHousehold(request);
  if (h instanceof Response) return h;
  const now = Date.now();
  const frame = await frameStore(h.id).getFrame(now);
  const enabled = loveEnabled(await householdLoveConfig(h.id));
  return Response.json({
    ...frame,
    photos: frame.photos.map((p) => toPhotoView(p, now, enabled)),
  });
}
