import { bindings } from "@/lib/cloudflare/bindings";
import { photoPrefix } from "@/lib/households/data";
import { requireHousehold } from "@/lib/households/request";

export const dynamic = "force-dynamic";

// Streams a WhatsApp photo out of the private R2 bucket to the (PIN-gated)
// frame, so the family photos never sit on a public URL. Only keys the webhook
// writes are allowed, and only the requesting household's own:
// whatsapp/<id>.<ext> for the original household, h/<household>/whatsapp/<id>.<ext> for the rest.
const FILE = /^[A-Za-z0-9_-]+\.(jpg|png|webp|gif)$/;

export async function GET(request: Request): Promise<Response> {
  const key = new URL(request.url).searchParams.get("k");
  if (!key) return new Response("missing key", { status: 400 });
  const h = await requireHousehold(request);
  if (h instanceof Response) return h;
  const prefix = photoPrefix(h.id);
  if (!key.startsWith(prefix) || !FILE.test(key.slice(prefix.length))) return new Response("forbidden", { status: 403 });

  const bucket = bindings().PHOTOS;
  if (!bucket) return new Response("not configured", { status: 502 });

  const obj = await bucket.get(key);
  if (!obj) return new Response("not found", { status: 404 });

  return new Response(obj.body, {
    headers: {
      "content-type": obj.httpMetadata?.contentType ?? "image/jpeg",
      // photos never change once stored
      "cache-control": "private, max-age=86400, immutable",
    },
  });
}
