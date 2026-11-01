import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isFramePath } from "@/lib/kitchen/frameKey";
import { readAdmin, readHousehold } from "@/lib/households/session";

// The gate for the whole site. This stays `middleware.ts` (edge runtime) rather
// than Next 16's `proxy.ts` (Node runtime only): OpenNext on Cloudflare supports
// edge middleware fully. (Next prints a deprecation warning for it at build.)
//
// Who gets in:
//   • a family page signed in with its household's PIN — `cv_h`, signed with SESSION_SECRET
//   • the admin — `cv_admin`
//   • the original household's PIN cookie — `cv_session` = SITE_PIN (household ludlow)
//   • a kitchen frame — `Authorization: Bearer <key>` on its own endpoints; the
//     route resolves the key to a household and answers 401 if it's unknown
// With neither SITE_PIN nor SESSION_SECRET set, the gate is off (local dev, tests).
// The unlock page/API and the WhatsApp webhook are always reachable.

const ALWAYS_OPEN = ["/unlock", "/api/unlock", "/api/whatsapp"];
// what a household other than the original one can reach: its family page and its frame's
// status — not the original household's Ludlow dashboard, calendar or rides pages
const HOUSEHOLD_PATHS = ["/family", "/api/family", "/api/photo", "/api/frame", "/kitchen/status", "/api/kitchen/status", "/api/kitchen/command", "/api/kitchen/debug"];
const under = (pathname: string, paths: string[]) => paths.some((p) => pathname === p || pathname.startsWith(`${p}/`));

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const pin = process.env.SITE_PIN;
  const secret = process.env.SESSION_SECRET;
  if (!pin && !secret) return NextResponse.next();

  const { pathname } = request.nextUrl;
  if (under(pathname, ALWAYS_OPEN)) return NextResponse.next();

  if (isFramePath(pathname) && request.headers.get("authorization")?.startsWith("Bearer ")) return NextResponse.next();

  if (pin && request.cookies.get("cv_session")?.value === pin) return NextResponse.next();
  if (secret) {
    if (await readAdmin(request.cookies.get("cv_admin")?.value, secret, process.env.ADMIN_PIN)) return NextResponse.next();
    // the signature only: the route checks the PIN version against D1
    const h = await readHousehold(request.cookies.get("cv_h")?.value, secret);
    if (h && (h.id === "ludlow" || under(pathname, HOUSEHOLD_PATHS))) return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.pathname = "/unlock";
  url.search = "";
  url.searchParams.set("from", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  // run on everything except static assets / image files
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon.png|apple-icon.png|.*\\.(?:png|webp|jpg|jpeg|svg|ico|xml|txt)).*)",
  ],
};
