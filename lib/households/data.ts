// Where a household's data lives: D1 when it's bound (production), otherwise the
// original single-household KV/memory store (local dev and the older tests).
import { bindings } from "@/lib/cloudflare/bindings";
import { db } from "@/lib/db/d1";
import { createD1Backend } from "@/lib/frame/d1store";
import { legacyBackend, type Backend } from "@/lib/frame/store";
import { getSettings, saveSettings, patchSettings, type FamilySettings } from "@/lib/family/settings";
import { addTodo, getTodos, removeTodo, toggleTodo, updateTodos, type Todo } from "@/lib/family/todos";
import { todosFor } from "@/lib/family/todosD1";
import { getHousehold, householdForPhoneNumberId, updateHouseholdSettings } from "@/lib/households/repo";
import { loveConfig, type LoveConfig } from "@/lib/frame/love";

const LEGACY = "ludlow";

let forceD1: boolean | null = null;
/** Tests: pretend D1 is (or isn't) bound. */
export function __useD1ForTest(on: boolean | null): void { forceD1 = on; }

export function hasD1(): boolean {
  if (forceD1 !== null) return forceD1;
  // switched on (HOUSEHOLDS_STORE=d1) only once the original household's records are migrated
  if (process.env.HOUSEHOLDS_STORE !== "d1") return false;
  try { return !!bindings().DB; } catch { return false; }
}

export function frameStore(h: string): Backend {
  return hasD1() ? createD1Backend(db(), h) : legacyBackend();
}

export async function householdSettings(h: string): Promise<FamilySettings> {
  if (!hasD1()) return getSettings();
  const found = await getHousehold(h);
  if (!found) throw new Error(`no household ${h}`);
  return found.settings;
}

export async function patchHousehold(h: string, patch: unknown): Promise<FamilySettings> {
  if (!hasD1()) return saveSettings(patchSettings(await getSettings(), patch));
  return updateHouseholdSettings(h, patch);
}

export interface TodoStore {
  list(now?: number): Promise<Todo[]>;
  add(text: string, now?: number): Promise<void>;
  toggle(id: string, now?: number): Promise<boolean>;
  remove(id: string): Promise<boolean>;
}

export function householdTodos(h: string): TodoStore {
  if (hasD1()) return todosFor(h);
  return {
    list: (now = Date.now()) => getTodos(now),
    add: async (text, now = Date.now()) => { await updateTodos((l) => addTodo(l, text, now), now); },
    toggle: async (id, now = Date.now()) => {
      const found = (await getTodos(now)).some((t) => t.id === id);
      if (found) await updateTodos((l) => toggleTodo(l, id, now), now);
      return found;
    },
    remove: async (id) => {
      const found = (await getTodos()).some((t) => t.id === id);
      if (found) await updateTodos((l) => removeTodo(l, id));
      return found;
    },
  };
}

/** Where a household's WhatsApp photos go in R2 (the original household keeps the original folder). */
export const photoPrefix = (h: string) => (h === LEGACY ? "whatsapp/" : `h/${h}/whatsapp/`);

/**
 * The household a WhatsApp message was sent to, by the receiving number's id.
 * The original household's number (or a payload without one) is theirs; a number
 * no household owns gets null and the message is dropped.
 */
export async function householdForWhatsApp(phoneNumberId: string | undefined): Promise<string | null> {
  if (!phoneNumberId || phoneNumberId === process.env.WHATSAPP_PHONE_NUMBER_ID || !hasD1()) return LEGACY;
  return householdForPhoneNumberId(phoneNumberId).catch(() => null);
}

/** Hearts go out from the household's own number (one Meta token for every number). */
export async function householdLoveConfig(h: string): Promise<LoveConfig> {
  const env = loveConfig();
  if (!hasD1()) return env;
  const own = (await getHousehold(h).catch(() => null))?.waPhoneNumberId ?? undefined;
  return { token: env.token, phoneNumberId: own ?? (h === LEGACY ? env.phoneNumberId : undefined) };
}
