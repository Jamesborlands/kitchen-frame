// Households on D1: who they are, how to recognise them (PIN, frame key,
// WhatsApp number) and their settings. Only hashes of PINs and frame keys are kept.
import { db } from "@/lib/db/d1";
import { patchSettings, sanitizeSettings, type FamilySettings } from "@/lib/family/settings";

export interface Household { id: string; name: string; waPhoneNumberId: string | null; settings: FamilySettings }

const ID = /^[a-z0-9][a-z0-9-]{1,30}$/;

export async function sha256(text: string): Promise<string> {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(d), (b) => b.toString(16).padStart(2, "0")).join("");
}

const pinHash = (pin: string, secret: string) => sha256(`pin:${secret}:${pin.trim()}`);

export async function createHousehold(h: { id: string; name: string; settings: FamilySettings }, now: number = Date.now()): Promise<void> {
  if (!ID.test(h.id)) throw new Error(`household id must be lower-case letters, digits and dashes: ${h.id}`);
  await db().prepare("INSERT INTO households (id, name, settings, created_at) VALUES (?, ?, ?, ?)")
    .bind(h.id, h.name.trim().slice(0, 60), JSON.stringify(sanitizeSettings(h.settings)), now).run();
}

export async function getHousehold(id: string): Promise<Household | null> {
  const r = await db().prepare("SELECT id, name, wa_phone_number_id, settings FROM households WHERE id = ?").bind(id)
    .first<{ id: string; name: string; wa_phone_number_id: string | null; settings: string }>();
  if (!r) return null;
  let raw: unknown = null;
  try { raw = JSON.parse(r.settings); } catch { /* a bad record falls back to the defaults */ }
  return { id: r.id, name: r.name, waPhoneNumberId: r.wa_phone_number_id, settings: sanitizeSettings(raw) };
}

export async function listHouseholds(): Promise<{ id: string; name: string }[]> {
  return (await db().prepare("SELECT id, name FROM households ORDER BY created_at, id").all<{ id: string; name: string }>()).results;
}

export async function updateHouseholdSettings(id: string, patch: unknown): Promise<FamilySettings> {
  const h = await getHousehold(id);
  if (!h) throw new Error(`no household ${id}`);
  const next = patchSettings(h.settings, patch);
  await db().prepare("UPDATE households SET settings = ? WHERE id = ?").bind(JSON.stringify(next), id).run();
  return next;
}

export async function setPin(id: string, pin: string, secret: string): Promise<void> {
  if (!/^\d{4,10}$/.test(pin.trim())) throw new Error("a PIN is 4–10 digits");
  const hash = await pinHash(pin, secret);
  const other = await db().prepare("SELECT id FROM households WHERE pin_hash = ? AND id != ?").bind(hash, id).first();
  if (other) throw new Error("that PIN is in use by another household");
  await db().prepare("UPDATE households SET pin_hash = ? WHERE id = ?").bind(hash, id).run();
}

/** Changes whenever the PIN does (a prefix of its hash); signed into the family page's cookie. */
export async function householdPinVersion(id: string): Promise<string | null> {
  const r = await db().prepare("SELECT pin_hash FROM households WHERE id = ?").bind(id).first<{ pin_hash: string | null }>();
  return r?.pin_hash ? r.pin_hash.slice(0, 16) : null;
}

export async function householdForPin(pin: string, secret: string): Promise<string | null> {
  const r = await db().prepare("SELECT id FROM households WHERE pin_hash = ?").bind(await pinHash(pin, secret)).first<{ id: string }>();
  return r?.id ?? null;
}

export async function addFrame(id: string, key: string, label: string, now: number = Date.now()): Promise<void> {
  await db().prepare("INSERT INTO frames (key_hash, household_id, label, created_at) VALUES (?, ?, ?, ?)")
    .bind(await sha256(`frame:${key}`), id, label, now).run();
}

export async function householdForFrameKey(key: string): Promise<string | null> {
  const r = await db().prepare("SELECT household_id AS id FROM frames WHERE key_hash = ?").bind(await sha256(`frame:${key}`)).first<{ id: string }>();
  return r?.id ?? null;
}

export async function setWhatsApp(id: string, phoneNumberId: string | null): Promise<void> {
  await db().prepare("UPDATE households SET wa_phone_number_id = ? WHERE id = ?").bind(phoneNumberId, id).run();
}

export async function householdForPhoneNumberId(phoneNumberId: string): Promise<string | null> {
  const r = await db().prepare("SELECT id FROM households WHERE wa_phone_number_id = ?").bind(phoneNumberId).first<{ id: string }>();
  return r?.id ?? null;
}
