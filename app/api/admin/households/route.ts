// Admin only: set up and look after households (scripts/household.mjs calls this).
// A new PIN or frame key is returned exactly once; only hashes are stored.
import { householdForRequest } from "@/lib/households/request";
import { addFrame, createHousehold, getHousehold, listHouseholds, setPin, setWhatsApp } from "@/lib/households/repo";
import { defaultSettingsFor } from "@/lib/households/defaults";

export const dynamic = "force-dynamic";

const randomPin = () => String(100000 + (crypto.getRandomValues(new Uint32Array(1))[0] % 900000));

/** A fresh PIN that isn't one of `taken` (the admin and the original household's PINs, checked before household PINs at sign-in). */
export function pickPin(roll: () => string = randomPin, taken: (string | undefined)[] = [process.env.ADMIN_PIN, process.env.SITE_PIN]): string {
  for (;;) {
    const pin = roll();
    if (!taken.includes(pin)) return pin;
  }
}
const randomKey = () => Array.from(crypto.getRandomValues(new Uint8Array(24)), (b) => b.toString(16).padStart(2, "0")).join("");

type Body = { action?: string; id?: string; name?: string; home?: unknown; phoneNumberId?: string | null; label?: string };

export async function POST(request: Request): Promise<Response> {
  const who = await householdForRequest(request);
  const secret = process.env.SESSION_SECRET;
  if (who?.via !== "admin" || !secret) return Response.json({ error: "admin only" }, { status: 403 });
  let b: Body;
  try {
    b = (await request.json()) as Body;
  } catch {
    return Response.json({ error: "bad request" }, { status: 400 });
  }
  const bad = (error: string) => Response.json({ error }, { status: 400 });
  try {
    if (b.action === "list") return Response.json({ households: await listHouseholds() });
    if (typeof b.id !== "string") return bad("id needed");

    if (b.action === "new") {
      if (typeof b.name !== "string" || !b.name.trim()) return bad("name needed");
      const settings = defaultSettingsFor(b.home as Parameters<typeof defaultSettingsFor>[0]);
      await createHousehold({ id: b.id, name: b.name, settings });
      const pin = pickPin();
      await setPin(b.id, pin, secret);
      const frameKey = randomKey();
      await addFrame(b.id, frameKey, "kitchen");
      return Response.json({ ok: true, pin, frameKey });
    }

    if (!(await getHousehold(b.id))) return Response.json({ error: "no such household" }, { status: 404 });
    if (b.action === "set-whatsapp") {
      if (b.phoneNumberId !== null && !/^\d{5,20}$/.test(String(b.phoneNumberId))) return bad("phone number id is digits");
      await setWhatsApp(b.id, b.phoneNumberId ?? null);
      return Response.json({ ok: true });
    }
    if (b.action === "reset-pin") {
      const pin = pickPin();
      await setPin(b.id, pin, secret);
      return Response.json({ ok: true, pin });
    }
    if (b.action === "add-frame") {
      const frameKey = randomKey();
      await addFrame(b.id, frameKey, (b.label ?? "kitchen").slice(0, 40));
      return Response.json({ ok: true, frameKey });
    }
    return bad("unknown action");
  } catch (e) {
    return bad(e instanceof Error ? e.message : "failed");
  }
}
