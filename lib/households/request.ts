// Which household a request is for: a frame's key, a family page's signed
// cookie, the original household's PIN cookie (→ ludlow), or the admin's
// cookie (+ the household he picked).
import { householdForFrameKey, householdPinVersion } from "@/lib/households/repo";
import { hasD1 } from "@/lib/households/data";
import { readAdmin, readHousehold } from "@/lib/households/session";
import { safeEqual } from "@/lib/kitchen/frameKey";

export const LEGACY_HOUSEHOLD = "ludlow";

export interface RequestHousehold { id: string; via: "frame" | "pin" | "admin" }

function cookie(req: Request, name: string): string | undefined {
  const all = req.headers.get("cookie") ?? "";
  for (const part of all.split(";")) {
    const i = part.indexOf("=");
    if (i > 0 && part.slice(0, i).trim() === name) {
      try { return decodeURIComponent(part.slice(i + 1).trim()); } catch { return undefined; }
    }
  }
  return undefined;
}

export async function householdForRequest(req: Request): Promise<RequestHousehold | null> {
  const h = await resolve(req);
  // with D1 off (the undo), every store is the original household's — nobody else may get in
  if (h && h.id !== LEGACY_HOUSEHOLD && !hasD1()) return null;
  return h;
}

async function resolve(req: Request): Promise<RequestHousehold | null> {
  const auth = req.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) {
    const key = auth.slice("Bearer ".length).trim();
    const legacy = process.env.FRAME_KEY;
    if (legacy && safeEqual(key, legacy)) return { id: LEGACY_HOUSEHOLD, via: "frame" };
    const id = key ? await householdForFrameKey(key).catch(() => null) : null;
    return id ? { id, via: "frame" } : null;
  }
  const secret = process.env.SESSION_SECRET;
  if (secret) {
    if (await readAdmin(cookie(req, "cv_admin"), secret, process.env.ADMIN_PIN)) return { id: cookie(req, "cv_pick") || LEGACY_HOUSEHOLD, via: "admin" };
    const signed = await readHousehold(cookie(req, "cv_h"), secret);
    if (signed && signed.version === (await householdPinVersion(signed.id).catch(() => null))) return { id: signed.id, via: "pin" };
  }
  const pin = process.env.SITE_PIN;
  if (pin && cookie(req, "cv_session") === pin) return { id: LEGACY_HOUSEHOLD, via: "pin" };
  // no gate configured (local dev, tests): the original household
  if (!pin && !secret) return { id: LEGACY_HOUSEHOLD, via: "pin" };
  return null;
}

/** For route handlers: the household, or a 401 to return as-is. */
export async function requireHousehold(req: Request): Promise<RequestHousehold | Response> {
  const h = await householdForRequest(req);
  if (h) return h;
  const frame = req.headers.get("authorization")?.startsWith("Bearer ");
  return Response.json({ error: frame ? "bad frame key" : "sign in" }, { status: 401 });
}
