// The latest kitchen-frame APK. The frame verifies its sha256 against
// /api/kitchen/release before installing. FRAME_KEY-gated.
import { bindings } from "@/lib/cloudflare/bindings";
import { apkKey, getRelease } from "@/lib/kitchen/release";
import { requireHousehold } from "@/lib/households/request";

export const dynamic = "force-dynamic";

export async function GET(request: Request = new Request("http://local/")): Promise<Response> {
  const h = await requireHousehold(request);
  if (h instanceof Response) return h;
  const r = await getRelease();
  const obj = r ? await bindings().PHOTOS?.get(apkKey(r.versionCode)) : null;
  if (!obj) return new Response("not found", { status: 404 });
  return new Response(obj.body, {
    headers: { "content-type": "application/vnd.android.package-archive", "cache-control": "no-store" },
  });
}
