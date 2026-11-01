// One-off, admin only: copy the original household's records from KV into D1 (household
// ludlow). Safe to run again. Live routes read D1 only once HOUSEHOLDS_STORE=d1.
import { householdForRequest } from "@/lib/households/request";
import { legacyBackend } from "@/lib/frame/store";
import { getTodos } from "@/lib/family/todos";
import { getSettings } from "@/lib/family/settings";
import { migrateLegacyHousehold } from "@/lib/households/migrate";

export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  const who = await householdForRequest(request);
  const secret = process.env.SESSION_SECRET;
  if (who?.via !== "admin" || !secret) return Response.json({ error: "admin only" }, { status: 403 });
  const now = Date.now();
  const report = await migrateLegacyHousehold({
    legacy: legacyBackend(),
    todos: await getTodos(now),
    settings: await getSettings(),
    frameKey: process.env.FRAME_KEY,
    sitePin: process.env.SITE_PIN,
    secret,
    now,
  });
  return Response.json({ ok: true, ...report });
}
