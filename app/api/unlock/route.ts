import { NextResponse } from "next/server";
import { householdForPin, householdPinVersion } from "@/lib/households/repo";
import { blocked, clientIp, failed } from "@/lib/households/throttle";
import { adminCookie, householdCookie } from "@/lib/households/session";
import { safeEqual } from "@/lib/kitchen/frameKey";

// Sign in to a family page: the admin's PIN, any household's PIN, or the
// original household's SITE_PIN (household ludlow). Each sets its own cookie.
const YEAR = 60 * 60 * 24 * 365;

function withCookie(name: string, value: string): NextResponse {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(name, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: YEAR,
  });
  return res;
}

export async function POST(request: Request): Promise<Response> {
  let submitted = "";
  try {
    submitted = String(((await request.json()) as { pin?: unknown })?.pin ?? "").trim();
  } catch {
    // ignore malformed body
  }
  if (!submitted) return NextResponse.json({ ok: false }, { status: 401 });
  const ip = clientIp(request);
  if (await blocked(ip)) return NextResponse.json({ ok: false, reason: "too-many-tries" }, { status: 429 });

  const secret = process.env.SESSION_SECRET;
  const admin = process.env.ADMIN_PIN;
  if (secret && admin && safeEqual(submitted, admin)) return withCookie("cv_admin", await adminCookie(secret, admin));

  const pin = process.env.SITE_PIN;
  if (pin && safeEqual(submitted, pin)) return withCookie("cv_session", pin);

  if (secret) {
    const id = await householdForPin(submitted, secret).catch(() => null);
    const version = id ? await householdPinVersion(id) : null;
    if (id && version) return withCookie("cv_h", await householdCookie(id, version, secret));
  }
  await failed(ip);
  return NextResponse.json({ ok: false }, { status: 401 });
}
