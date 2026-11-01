// One-off: the original household's records from the original single-household KV store into
// D1 as household "ludlow". Ids are kept (the frame and the bin refer to them);
// safe to run again — every row is INSERT OR IGNORE.
import { db } from "@/lib/db/d1";
import type { Backend } from "@/lib/frame/store";
import type { FamilySettings } from "@/lib/family/settings";
import type { Todo } from "@/lib/family/todos";
import { sha256 } from "@/lib/households/repo";

export const LEGACY_ID = "ludlow";

export interface MigrateInput {
  legacy: Backend;
  todos: Todo[];
  settings: FamilySettings;
  frameKey: string | undefined;
  sitePin: string | undefined;
  secret: string;
  now: number;
}

export async function migrateLegacyHousehold(i: MigrateInput): Promise<{ photos: number; notes: number; todos: number }> {
  const d = db();
  const h = LEGACY_ID;
  const admin = await i.legacy.getAdmin(i.now);
  const frame = await i.legacy.getFrame(i.now);
  const stmts = [
    d.prepare("INSERT OR IGNORE INTO households (id, name, settings, created_at) VALUES (?, ?, ?, ?)")
      .bind(h, "Anne & Peter", JSON.stringify(i.settings), i.now),
  ];
  if (i.sitePin) stmts.push(d.prepare("UPDATE households SET pin_hash = ? WHERE id = ? AND pin_hash IS NULL").bind(await sha256(`pin:${i.secret}:${i.sitePin.trim()}`), h));
  if (i.frameKey) {
    stmts.push(d.prepare("INSERT OR IGNORE INTO frames (key_hash, household_id, label, created_at) VALUES (?, ?, ?, ?)")
      .bind(await sha256(`frame:${i.frameKey}`), h, "kitchen", i.now));
  }

  const photos = [
    ...admin.photos.map((p) => ({ p, deletedAt: null as number | null })),
    ...admin.trash.flatMap((t) => (t.kind === "photo" ? [{ p: t.item, deletedAt: t.deletedAt }] : [])),
  ];
  for (const { p, deletedAt } of photos) {
    stmts.push(d.prepare(
      "INSERT OR IGNORE INTO photos (id, household_id, url, from_name, caption, at, wa_from, wa_message_id, hidden, deleted_at, loved_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    ).bind(p.id, h, p.url, p.from, p.caption ?? null, p.at, p.waFrom ?? null, p.waMessageId ?? null, p.hidden ? 1 : 0, deletedAt, p.lovedAt ?? null));
  }
  const notes = new Map(frame.notes.concat(admin.notes).map((n) => [n.id, { n, deletedAt: null as number | null }]));
  for (const t of admin.trash) if (t.kind === "note") notes.set(t.item.id, { n: t.item, deletedAt: t.deletedAt });
  for (const { n, deletedAt } of notes.values()) {
    stmts.push(d.prepare("INSERT OR IGNORE INTO notes (id, household_id, text, from_name, at, deleted_at) VALUES (?, ?, ?, ?, ?, ?)")
      .bind(n.id, h, n.text, n.from, n.at, deletedAt));
  }
  for (const e of admin.log) {
    stmts.push(d.prepare("INSERT OR IGNORE INTO log (id, household_id, at, kind, from_name, text, url) VALUES (?, ?, ?, ?, ?, ?, ?)")
      .bind(e.id, h, e.at, e.kind, e.from, e.text ?? null, e.url ?? null));
  }
  for (const t of i.todos) {
    stmts.push(d.prepare("INSERT OR IGNORE INTO todos (id, household_id, text, done, at, done_at) VALUES (?, ?, ?, ?, ?, ?)")
      .bind(t.id, h, t.text, t.done ? 1 : 0, t.at, t.doneAt ?? null));
  }
  // D1 caps a batch; chunk to be safe
  for (let k = 0; k < stmts.length; k += 50) await d.batch(stmts.slice(k, k + 50));
  return { photos: photos.length, notes: notes.size, todos: i.todos.length };
}
