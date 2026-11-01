// The frame store on D1, one household at a time: same behaviour as the KV store
// (lib/frame/store.ts), but every change is a single SQL statement, so a photo
// arriving while someone deletes another can't be lost, and nothing needs the
// KV overlays.
import type { D1Like } from "@/lib/db/d1";
import {
  TRASH_KEEP_MS, MAX_LOG, photoKeyFromUrl,
  type AdminView, type Backend, type Frame, type FrameNote, type FramePhoto, type LogEntry, type TrashItem,
} from "@/lib/frame/store";

const NOTE_TTL = 24 * 60 * 60 * 1000;
let counter = 0;
const newId = (at: number) => `${at}-${(++counter).toString(36)}${Math.random().toString(36).slice(2, 5)}`;

interface PhotoRow {
  id: string; url: string; from_name: string; sender_override: string | null; caption: string | null; at: number;
  wa_from: string | null; wa_message_id: string | null; hidden: number; deleted_at: number | null; loved_at: number | null;
}
interface NoteRow { id: string; text: string; from_name: string; at: number; deleted_at: number | null }

function toPhoto(r: PhotoRow): FramePhoto {
  const p: FramePhoto = { id: r.id, url: r.url, from: r.sender_override ?? r.from_name, at: r.at };
  if (r.caption) p.caption = r.caption;
  if (r.wa_from) p.waFrom = r.wa_from;
  if (r.wa_message_id) p.waMessageId = r.wa_message_id;
  if (r.loved_at) p.lovedAt = r.loved_at;
  if (r.hidden) p.hidden = true;
  return p;
}
const toNote = (r: NoteRow): FrameNote => ({ id: r.id, text: r.text, from: r.from_name, at: r.at });
/** Rows changed by a run(): D1 reports meta.changes, node:sqlite (tests) reports changes. */
const changed = (res: unknown) => {
  const r = res as { meta?: { changes?: number }; changes?: number };
  return (r.meta?.changes ?? r.changes ?? 0) > 0;
};

export function createD1Backend(db: D1Like, h: string): Backend {
  const table = (kind: "photo" | "note") => (kind === "photo" ? "photos" : "notes");
  return {
    async addPhoto(p) {
      const at = p.at ?? Date.now();
      const photo: FramePhoto = { ...p, id: newId(at), at };
      await db.batch([
        db.prepare("INSERT INTO photos (id, household_id, url, from_name, caption, at, wa_from, wa_message_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
          .bind(photo.id, h, photo.url, photo.from, photo.caption ?? null, at, photo.waFrom ?? null, photo.waMessageId ?? null),
        db.prepare("INSERT OR REPLACE INTO log (id, household_id, at, kind, from_name, text, url) VALUES (?, ?, ?, 'photo', ?, ?, ?)")
          .bind(photo.id, h, at, photo.from, photo.caption ?? null, photo.url),
      ]);
      return photo;
    },
    async addNote(n) {
      const at = n.at ?? Date.now();
      const note: FrameNote = { ...n, id: newId(at), at };
      await db.batch([
        db.prepare("INSERT INTO notes (id, household_id, text, from_name, at) VALUES (?, ?, ?, ?, ?)").bind(note.id, h, note.text, note.from, at),
        db.prepare("INSERT OR REPLACE INTO log (id, household_id, at, kind, from_name, text) VALUES (?, ?, ?, 'note', ?, ?)")
          .bind(note.id, h, at, note.from, note.text),
      ]);
      return note;
    },
    async getFrame(now): Promise<Frame> {
      const [photos, notes] = await Promise.all([
        db.prepare("SELECT * FROM photos WHERE household_id = ? AND hidden = 0 AND deleted_at IS NULL ORDER BY at DESC").bind(h).all<PhotoRow>(),
        db.prepare("SELECT * FROM notes WHERE household_id = ? AND deleted_at IS NULL AND at > ? ORDER BY at DESC").bind(h, now - NOTE_TTL).all<NoteRow>(),
      ]);
      return { photos: photos.results.map(toPhoto), notes: notes.results.map(toNote) };
    },
    async setSender(id, name) {
      const clean = name.trim().slice(0, 50);
      return changed(await db.prepare("UPDATE photos SET sender_override = ? WHERE id = ? AND household_id = ?").bind(clean || null, id, h).run());
    },
    async markLoved(id, at) {
      await db.prepare("UPDATE photos SET loved_at = ? WHERE id = ? AND household_id = ?").bind(at, id, h).run();
    },
    async setHidden(id, hidden) {
      return changed(await db.prepare("UPDATE photos SET hidden = ? WHERE id = ? AND household_id = ?").bind(hidden ? 1 : 0, id, h).run());
    },
    async deleteItem(kind, id, now) {
      return changed(await db.prepare(`UPDATE ${table(kind)} SET deleted_at = ? WHERE id = ? AND household_id = ? AND deleted_at IS NULL`).bind(now, id, h).run());
    },
    async restoreItem(kind, id) {
      const purged = kind === "photo" ? " AND purged = 0" : "";
      return changed(await db.prepare(`UPDATE ${table(kind)} SET deleted_at = NULL WHERE id = ? AND household_id = ? AND deleted_at IS NOT NULL${purged}`).bind(id, h).run());
    },
    async getAdmin(now): Promise<AdminView> {
      const since = now - TRASH_KEEP_MS;
      const [photos, notes, trashPhotos, trashNotes, log, gonePhotos, goneNotes] = await Promise.all([
        db.prepare("SELECT * FROM photos WHERE household_id = ? AND deleted_at IS NULL ORDER BY at DESC").bind(h).all<PhotoRow>(),
        db.prepare("SELECT * FROM notes WHERE household_id = ? AND deleted_at IS NULL AND at > ? ORDER BY at DESC").bind(h, now - NOTE_TTL).all<NoteRow>(),
        db.prepare("SELECT * FROM photos WHERE household_id = ? AND deleted_at IS NOT NULL AND purged = 0 AND deleted_at >= ?").bind(h, since).all<PhotoRow>(),
        db.prepare("SELECT * FROM notes WHERE household_id = ? AND deleted_at IS NOT NULL AND deleted_at >= ?").bind(h, since).all<NoteRow>(),
        db.prepare("SELECT id, at, kind, from_name, text, url FROM log WHERE household_id = ? ORDER BY at DESC LIMIT ?").bind(h, MAX_LOG)
          .all<{ id: string; at: number; kind: "photo" | "note"; from_name: string; text: string | null; url: string | null }>(),
        db.prepare("SELECT id FROM photos WHERE household_id = ? AND deleted_at IS NOT NULL").bind(h).all<{ id: string }>(),
        db.prepare("SELECT id FROM notes WHERE household_id = ? AND deleted_at IS NOT NULL").bind(h).all<{ id: string }>(),
      ]);
      const trash: TrashItem[] = [
        ...trashPhotos.results.map((r) => ({ kind: "photo" as const, item: toPhoto(r), deletedAt: r.deleted_at! })),
        ...trashNotes.results.map((r) => ({ kind: "note" as const, item: toNote(r), deletedAt: r.deleted_at! })),
      ].sort((a, b) => b.deletedAt - a.deletedAt);
      const gone = new Set([...gonePhotos.results.map((r) => `photo:${r.id}`), ...goneNotes.results.map((r) => `note:${r.id}`)]);
      return {
        photos: photos.results.map(toPhoto),
        notes: notes.results.map(toNote),
        trash,
        log: log.results.map((r): LogEntry => {
          if (gone.has(`${r.kind}:${r.id}`)) return { id: r.id, at: r.at, kind: r.kind, from: r.from_name, deleted: true };
          const e: LogEntry = { id: r.id, at: r.at, kind: r.kind, from: r.from_name };
          if (r.text) e.text = r.text;
          if (r.url) e.url = r.url;
          return e;
        }),
      };
    },
    async purgeTrash(now) {
      const before = now - TRASH_KEEP_MS;
      const expired = await db.prepare("SELECT url FROM photos WHERE household_id = ? AND deleted_at IS NOT NULL AND purged = 0 AND deleted_at < ?")
        .bind(h, before).all<{ url: string }>();
      await db.batch([
        db.prepare("UPDATE photos SET purged = 1 WHERE household_id = ? AND deleted_at IS NOT NULL AND purged = 0 AND deleted_at < ?").bind(h, before),
        db.prepare("DELETE FROM notes WHERE household_id = ? AND deleted_at IS NOT NULL AND deleted_at < ?").bind(h, before),
      ]);
      return expired.results.map((r) => photoKeyFromUrl(r.url)).filter((k): k is string => !!k);
    },
    async reset() {
      await db.batch(["photos", "notes", "log", "todos"].map((t) => db.prepare(`DELETE FROM ${t} WHERE household_id = ?`).bind(h)));
    },
  };
}
