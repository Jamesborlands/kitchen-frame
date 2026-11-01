import { frameStore, photoPrefix } from "@/lib/households/data";
import { bindings } from "@/lib/cloudflare/bindings";

// Downloads a WhatsApp photo from the Meta Cloud API and stores it in the R2
// PHOTOS bucket, then records it in the frame store. Kept separate from the
// webhook route so the whole flow is unit-testable with injected fetch/put.

export const GRAPH_API = "https://graph.facebook.com/v21.0";

export interface MetaImageRef {
  id: string;
  caption?: string;
  mime_type?: string;
}

/** Stores the photo bytes under `key`; injectable for tests. */
export type PhotoPut = (key: string, bytes: ArrayBuffer, contentType: string) => Promise<void>;

export interface IngestDeps {
  fetchImpl?: typeof fetch;
  put?: PhotoPut;
  token?: string; // WHATSAPP_TOKEN
}

/** Where the browser loads a stored photo from (PIN-gated, see /api/photo). */
export function photoUrl(key: string): string {
  return `/api/photo?k=${encodeURIComponent(key)}`;
}

function r2Put(): PhotoPut | null {
  const bucket = bindings().PHOTOS;
  if (!bucket) return null;
  return async (key, bytes, contentType) => {
    await bucket.put(key, bytes, { httpMetadata: { contentType } });
  };
}

export function extFromContentType(contentType: string): string {
  const ct = contentType.toLowerCase();
  if (ct.includes("png")) return "png";
  if (ct.includes("webp")) return "webp";
  if (ct.includes("gif")) return "gif";
  return "jpg";
}

/**
 * Resolve a Meta media id to its bytes: first GET the media metadata for the
 * (short-lived, auth-gated) download URL, then download the bytes with the token.
 */
export async function fetchWhatsAppMedia(
  mediaId: string,
  token: string,
  fetchImpl: typeof fetch = fetch,
): Promise<{ bytes: ArrayBuffer; contentType: string }> {
  const metaRes = await fetchImpl(`${GRAPH_API}/${mediaId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!metaRes.ok) throw new Error(`media meta ${metaRes.status}`);
  const meta = (await metaRes.json()) as { url?: string; mime_type?: string };
  if (!meta.url) throw new Error("media url missing");

  const binRes = await fetchImpl(meta.url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!binRes.ok) throw new Error(`media download ${binRes.status}`);

  const contentType =
    meta.mime_type ?? binRes.headers.get("content-type") ?? "image/jpeg";
  return { bytes: await binRes.arrayBuffer(), contentType };
}

/**
 * Full ingest: download the photo from Meta, store it in R2, and add it to the
 * frame store. Returns the photo's URL, or `null` if photo storage isn't
 * configured or any step fails — the caller then falls back to a lightweight
 * placeholder note so the webhook still returns a fast 200.
 */
export async function ingestWhatsAppPhoto(
  img: MetaImageRef,
  from: string,
  deps: IngestDeps = {},
  wa: { waFrom?: string; waMessageId?: string } = {},
  household: string = "ludlow",
): Promise<string | null> {
  const token = deps.token ?? process.env.WHATSAPP_TOKEN;
  const put = deps.put ?? r2Put();
  // Not configured yet (e.g. text-notes-only deploy) — skip, caller notes it.
  if (!token || !put) return null;

  try {
    const fetchImpl = deps.fetchImpl ?? fetch;
    const { bytes, contentType } = await fetchWhatsAppMedia(img.id, token, fetchImpl);
    const key = `${photoPrefix(household)}${img.id}.${extFromContentType(contentType)}`;
    // Private bucket: photos are served back through /api/photo (behind the PIN),
    // never on a public URL.
    await put(key, bytes, contentType);
    const url = photoUrl(key);
    await frameStore(household).addPhoto({
      url,
      from: from.slice(0, 50),
      caption: img.caption?.slice(0, 200),
      ...wa,
    });
    return url;
  } catch {
    return null;
  }
}
