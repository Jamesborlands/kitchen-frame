// The kitchen photo frame's data store.
//
// Two backends behind one async interface:
//   • in-memory  — used locally, in tests, and as a fail-soft fallback.
//   • Cloudflare Workers KV — used whenever the FRAME namespace is bound (in
//     production), so photo and note records survive across Worker isolates.
//
// All cap / prune / sort logic lives in the pure helpers below and is shared by
// both backends, so the KV backend only ever does get/set/del — the smallest
// possible wire surface.

import { bindings, type KVLike } from "@/lib/cloudflare/bindings";

export interface FramePhoto {
  id: string;
  url: string;
  from: string;
  caption?: string;
  at: number;
  // WhatsApp sender + message id, so the kitchen can ❤️ the original message.
  // Server-only: /api/frame strips them before the photo reaches the browser.
  waFrom?: string;
  waMessageId?: string;
  lovedAt?: number;
  // hidden from the frame by a parent on /family (still listed there)
  hidden?: boolean;
}

export interface FrameNote {
  id: string;
  text: string;
  from: string;
  at: number;
}

export interface Frame {
  photos: FramePhoto[];
  notes: FrameNote[];
}

export type ItemKind = "photo" | "note";

/** Something a parent deleted on /family: restorable for 30 days, then purged. */
// `purged`: past 30 days and its photo bytes deleted. Kept (out of sight) as a
// tombstone while the record is still in the WhatsApp-written list, so it never
// comes back; dropped once the list has moved on.
export type TrashItem =
  | { kind: "photo"; item: FramePhoto; deletedAt: number; purged?: boolean }
  | { kind: "note"; item: FrameNote; deletedAt: number; purged?: boolean };

/** Who sent what, kept long after the 24h board has moved on. */
export interface LogEntry {
  id: string;
  at: number;
  kind: ItemKind;
  from: string;
  text?: string; // the note, or the photo's caption
  url?: string; // photos only
  deleted?: boolean; // deleted on /family: who and when stay, what it was doesn't
}

/** Everything /family shows: all photos (hidden ones too), live notes, the bin and the log. */
export interface AdminView extends Frame {
  trash: TrashItem[];
  log: LogEntry[];
}

export const TRASH_KEEP_MS = 30 * 24 * 60 * 60 * 1000;
export const MAX_LOG = 500;

// Every photo is kept until someone deletes it on /family or the frame. This is
// only a safety limit (the list is one KV value; ~200 bytes a photo).
export const MAX_PHOTOS = 5000;
const MAX_NOTES = 50;
const NOTE_TTL = 24 * 60 * 60 * 1000; // 24 hours in ms

const PHOTOS_KEY = "frame:photos";
const NOTES_KEY = "frame:notes";
const TRASH_KEY = "frame:trash";
const HIDDEN_KEY = "frame:hidden";
const LOVED_KEY = "frame:loved"; // { photoId: lovedAt } — hearts never rewrite frame:photos
const SENDERS_KEY = "frame:senders"; // { photoId: name } — "who sent this?", named on /family
const LOG_KEY = "frame:log";

let idCounter = 0;
function makeId(at: number): string {
  // Unique without a shared sequence: timestamp + a short suffix. The suffix
  // keeps ids distinct when two records share a millisecond.
  return `${at}-${(++idCounter).toString(36)}`;
}

const byNewest = <T extends { at: number }>(a: T, b: T): number => b.at - a.at;

// ---- pure logic (shared by both backends, exported for testing) ----

export function withPhoto(
  photos: FramePhoto[],
  p: Omit<FramePhoto, "id" | "at"> & { at?: number },
): { photos: FramePhoto[]; photo: FramePhoto } {
  const photo: FramePhoto = { ...p, id: makeId(p.at ?? Date.now()), at: p.at ?? Date.now() };
  const next = [...photos, photo].sort(byNewest).slice(0, MAX_PHOTOS);
  return { photos: next, photo };
}

export function withNote(
  notes: FrameNote[],
  n: Omit<FrameNote, "id" | "at"> & { at?: number },
  now: number = Date.now(),
): { notes: FrameNote[]; note: FrameNote } {
  const note: FrameNote = { ...n, id: makeId(n.at ?? now), at: n.at ?? now };
  let next = [...notes, note].filter((nn) => nn.at > now - NOTE_TTL);
  if (next.length > MAX_NOTES) next = next.sort(byNewest).slice(0, MAX_NOTES);
  return { notes: next, note };
}

export function withLoved(photos: FramePhoto[], id: string, at: number): FramePhoto[] {
  return photos.map((p) => (p.id === id ? { ...p, lovedAt: at } : p));
}

const goneKey = (kind: ItemKind, id: string) => `${kind}:${id}`;

/** Everything a parent deleted (in the bin or purged), as `kind:id`. */
export function goneSet(trash: TrashItem[]): Set<string> {
  return new Set(trash.map((t) => goneKey(t.kind, t.item.id)));
}

export function withLogEntry(log: LogEntry[], e: LogEntry): LogEntry[] {
  return [e, ...log].sort(byNewest).slice(0, MAX_LOG);
}

/** The R2 key inside a stored photo's url (`/api/photo?k=…`), or null for bundled images. */
export function photoKeyFromUrl(url: string): string | null {
  if (!url.startsWith("/api/photo?")) return null;
  return new URLSearchParams(url.slice(url.indexOf("?") + 1)).get("k");
}

function withLovedMap(photos: FramePhoto[], loved: Record<string, number>, senders: Record<string, string> = {}): FramePhoto[] {
  return photos.map((p) => {
    let out = p;
    if (loved[p.id] && !p.lovedAt) out = { ...out, lovedAt: loved[p.id] };
    if (senders[p.id]) out = { ...out, from: senders[p.id] };
    return out;
  });
}

/**
 * What the frame shows. Parents' hides and deletes live in their own records and
 * are applied here, over the lists the WhatsApp webhook writes, so the two never
 * overwrite each other.
 */
export function selectFrame(
  photos: FramePhoto[],
  notes: FrameNote[],
  now: number,
  hidden: string[] = [],
  gone: Set<string> = new Set(),
  loved: Record<string, number> = {},
  senders: Record<string, string> = {},
): Frame {
  const cutoff = now - NOTE_TTL;
  const hiddenIds = new Set(hidden);
  return {
    photos: withLovedMap(photos, loved, senders)
      .filter((p) => !p.hidden && !hiddenIds.has(p.id) && !gone.has(goneKey("photo", p.id)))
      .sort(byNewest),
    notes: notes.filter((n) => n.at > cutoff && !gone.has(goneKey("note", n.id))).sort(byNewest),
  };
}

// ---- backend interface ----

export interface Backend {
  addPhoto(p: Omit<FramePhoto, "id" | "at"> & { at?: number }): Promise<FramePhoto>;
  addNote(n: Omit<FrameNote, "id" | "at"> & { at?: number }): Promise<FrameNote>;
  getFrame(now: number): Promise<Frame>;
  markLoved(id: string, at: number): Promise<void>;
  /** Name who sent a photo (blank: back to what WhatsApp said). */
  setSender(id: string, name: string): Promise<boolean>;
  setHidden(id: string, hidden: boolean): Promise<boolean>;
  deleteItem(kind: ItemKind, id: string, now: number): Promise<boolean>;
  restoreItem(kind: ItemKind, id: string): Promise<boolean>;
  getAdmin(now: number): Promise<AdminView>;
  /** Drop bin items past 30 days; returns the R2 keys of their photos, for the caller to delete. */
  purgeTrash(now: number): Promise<string[]>;
  reset(): Promise<void>;
}

// ---- in-memory backend: the KV backend over a Map ----

function mapKV(): KeyValueLike {
  const m = new Map<string, unknown>();
  return {
    async get<T>(key: string) { return (m.get(key) as T | undefined) ?? null; },
    async set(key, value) { m.set(key, structuredClone(value)); },
    async del(...keys) { keys.forEach((k) => m.delete(k)); },
  };
}

function createMemoryBackend(seed = true): Backend {
  const kv = mapKV();
  if (seed) {
    // Local dev / demo: a made-up family (public/demo/), so /kitchen and the frame app have something to show.
    const now = Date.now();
    const min = 60_000;
    const photos: [string, string, string, number][] = [
      ["santacruz-dog.jpg", "Sam", "Biscuit's favourite time of day", 3],
      ["sunday-roast.jpg", "Anne", "Sunday lunch is on — wish you were all here", 40],
      ["queenstown-ski.jpg", "Tom", "First proper powder day of the season!", 95],
      ["edinburgh-coffee.jpg", "Kate", "Morning wander up the Old Town", 180],
      ["shell-hand.jpg", "Sam", "She insisted this one comes home with us", 300],
      ["bass-rock-mist.jpg", "Kate", "Misty walk at North Berwick this morning", 420],
      ["sourdough.jpg", "Peter", "Finally got the crust right!", 600],
      ["mtb-trail.jpg", "Tom", "Quick ride before work", 900],
    ];
    void kv.set(PHOTOS_KEY, photos.map(([file, from, caption, ago]) => (
      { id: makeId(now - ago * min), url: `/demo/${file}`, from, caption, at: now - ago * min }
    )));
    void kv.set(NOTES_KEY, [
      { id: makeId(now - 5 * min), text: "fish and chips tonight?", from: "Peter", at: now - 5 * min },
      { id: makeId(now - 120 * min), text: "landed safely, love you all x", from: "Kate", at: now - 120 * min },
      { id: makeId(now - 400 * min), text: "call you sunday!", from: "Tom", at: now - 400 * min },
    ]);
  }
  // one isolate, no other writers: nothing to wait for
  return createKeyValueBackend(kv, { settle: async () => {}, retryPause: async () => {} });
}

// ---- key-value backend (Workers KV) ----

/** The get/set/del slice the backend needs — injectable for tests. */
export interface KeyValueLike {
  get<T>(key: string): Promise<T | null>;
  set(key: string, value: unknown): Promise<unknown>;
  del(...keys: string[]): Promise<unknown>;
}

/** Workers KV speaks strings; this gives it the get/set/del shape (JSON values). */
export function fromWorkersKV(kv: KVLike): KeyValueLike {
  return {
    async get<T>(key: string) {
      return ((await kv.get(key, "json")) as T | null) ?? null;
    },
    async set(key, value) {
      await kv.put(key, JSON.stringify(value));
    },
    async del(...keys) {
      await Promise.all(keys.map((k) => kv.delete(k)));
    },
  };
}

const randomPause = () => new Promise<void>((r) => setTimeout(r, 150 + Math.random() * 350));

export function createKeyValueBackend(
  kv: KeyValueLike,
  // pauses (injectable for tests): before checking a save stuck, and before
  // retrying a write Workers KV refused (it allows ~1 write a second per key)
  opts: { settle?: () => Promise<void>; retryPause?: () => Promise<void> } = {},
): Backend {
  const settle = opts.settle ?? randomPause;
  const retryPause = opts.retryPause ?? (() => new Promise<void>((r) => setTimeout(r, 1100)));
  const setWithRetry = async (key: string, value: unknown) => {
    for (let attempt = 0; ; attempt++) {
      try {
        return await kv.set(key, value);
      } catch (e) {
        if (attempt >= 3) throw e;
        await retryPause();
      }
    }
  };
  const list = async <T>(key: string): Promise<T[]> => (await kv.get<T[]>(key)) ?? [];
  // the log is a side record: failing to write it must never lose the photo or note itself
  const log = async (e: LogEntry) => {
    const clean: LogEntry = { id: e.id, at: e.at, kind: e.kind, from: e.from };
    if (e.text) clean.text = e.text;
    if (e.url) clean.url = e.url;
    try {
      await kv.set(LOG_KEY, withLogEntry(await list<LogEntry>(LOG_KEY), clean));
    } catch {
      // ignore
    }
  };
  return {
    async addPhoto(p) {
      const r = withPhoto(await list<FramePhoto>(PHOTOS_KEY), p);
      await setWithRetry(PHOTOS_KEY, r.photos);
      // An album arrives as several webhooks at once, each saving the whole list:
      // check ours survived, and if another save overwrote it, add it again.
      for (let attempt = 0; attempt < 3; attempt++) {
        await settle();
        const now = await list<FramePhoto>(PHOTOS_KEY);
        if (now.some((x) => x.id === r.photo.id)) break;
        await setWithRetry(PHOTOS_KEY, [...now, r.photo].sort(byNewest).slice(0, MAX_PHOTOS));
      }
      await log({ id: r.photo.id, at: r.photo.at, kind: "photo", from: r.photo.from, text: r.photo.caption, url: r.photo.url });
      return r.photo;
    },
    async addNote(n) {
      const current = (await kv.get<FrameNote[]>(NOTES_KEY)) ?? [];
      const r = withNote(current, n);
      await kv.set(NOTES_KEY, r.notes);
      await log({ id: r.note.id, at: r.note.at, kind: "note", from: r.note.from, text: r.note.text });
      return r.note;
    },
    async getFrame(now) {
      const [photos, notes, hidden, trash, loved, senders] = await Promise.all([
        list<FramePhoto>(PHOTOS_KEY), list<FrameNote>(NOTES_KEY), list<string>(HIDDEN_KEY), list<TrashItem>(TRASH_KEY),
        kv.get<Record<string, number>>(LOVED_KEY), kv.get<Record<string, string>>(SENDERS_KEY),
      ]);
      return selectFrame(photos, notes, now, hidden, goneSet(trash), loved ?? {}, senders ?? {});
    },
    async setSender(id, name) {
      const photos = await list<FramePhoto>(PHOTOS_KEY);
      if (!photos.some((p) => p.id === id)) return false;
      const senders = { ...((await kv.get<Record<string, string>>(SENDERS_KEY)) ?? {}) };
      const clean = name.trim().slice(0, 50);
      if (clean) senders[id] = clean;
      else delete senders[id];
      await setWithRetry(SENDERS_KEY, senders);
      return true;
    },
    async markLoved(id, at) {
      // its own record: a heart must never rewrite the list incoming photos are added to
      const loved = (await kv.get<Record<string, number>>(LOVED_KEY)) ?? {};
      await setWithRetry(LOVED_KEY, { ...loved, [id]: at });
    },
    // Parents' actions write only frame:hidden and frame:trash — never the lists
    // the webhook writes (see selectFrame).
    async setHidden(id, hidden) {
      const photos = await list<FramePhoto>(PHOTOS_KEY);
      if (!photos.some((p) => p.id === id)) return false;
      const live = new Set(photos.map((p) => p.id));
      const current = (await list<string>(HIDDEN_KEY)).filter((h) => h !== id && live.has(h));
      await kv.set(HIDDEN_KEY, hidden ? [...current, id] : current);
      return true;
    },
    async deleteItem(kind, id, now) {
      const items = await list<FramePhoto | FrameNote>(kind === "photo" ? PHOTOS_KEY : NOTES_KEY);
      const item = items.find((x) => x.id === id);
      if (!item) return false;
      const trash = await list<TrashItem>(TRASH_KEY);
      if (!trash.some((t) => t.kind === kind && t.item.id === id)) {
        await kv.set(TRASH_KEY, [{ kind, item, deletedAt: now } as TrashItem, ...trash]);
      }
      return true;
    },
    async restoreItem(kind, id) {
      const trash = await list<TrashItem>(TRASH_KEY);
      const t = trash.find((x) => x.kind === kind && x.item.id === id && !x.purged);
      if (!t) return false;
      await kv.set(TRASH_KEY, trash.filter((x) => x !== t));
      // only if the list has since dropped it (safety limit): put it back
      const key = kind === "photo" ? PHOTOS_KEY : NOTES_KEY;
      const items = await list<FramePhoto | FrameNote>(key);
      if (!items.some((x) => x.id === id)) await kv.set(key, [...items, t.item].sort(byNewest));
      return true;
    },
    async getAdmin(now) {
      const [rawPhotos, notes, hidden, trash, entries, loved, senders] = await Promise.all([
        list<FramePhoto>(PHOTOS_KEY), list<FrameNote>(NOTES_KEY), list<string>(HIDDEN_KEY), list<TrashItem>(TRASH_KEY), list<LogEntry>(LOG_KEY),
        kv.get<Record<string, number>>(LOVED_KEY), kv.get<Record<string, string>>(SENDERS_KEY),
      ]);
      const photos = withLovedMap(rawPhotos, loved ?? {}, senders ?? {});
      const gone = goneSet(trash);
      const hiddenIds = new Set(hidden);
      return {
        photos: photos
          .filter((p) => !gone.has(goneKey("photo", p.id)))
          .map((p) => (hiddenIds.has(p.id) ? { ...p, hidden: true } : p))
          .sort(byNewest),
        notes: selectFrame([], notes, now, [], gone).notes,
        trash: trash.filter((t) => !t.purged && now - t.deletedAt <= TRASH_KEEP_MS).sort((a, b) => b.deletedAt - a.deletedAt),
        log: entries.map((e) =>
          gone.has(goneKey(e.kind, e.id)) ? { id: e.id, at: e.at, kind: e.kind, from: e.from, deleted: true } : e,
        ),
      };
    },
    async purgeTrash(now) {
      const [trash, photos, notes] = await Promise.all([
        list<TrashItem>(TRASH_KEY), list<FramePhoto>(PHOTOS_KEY), list<FrameNote>(NOTES_KEY),
      ]);
      const live = new Set([...photos.map((p) => goneKey("photo", p.id)), ...notes.map((n) => goneKey("note", n.id))]);
      const expired = trash.filter((t) => !t.purged && now - t.deletedAt > TRASH_KEEP_MS);
      // tombstones are needed only while the webhook's list still holds the record
      const next = trash
        .map((t) => (expired.includes(t) ? { ...t, purged: true } : t))
        .filter((t) => !t.purged || live.has(goneKey(t.kind, t.item.id)));
      if (!expired.length && next.length === trash.length) return [];
      await kv.set(TRASH_KEY, next);
      return expired.flatMap((t) => (t.kind === "photo" ? [photoKeyFromUrl(t.item.url)] : [])).filter((k): k is string => !!k);
    },
    async reset() {
      await kv.del(PHOTOS_KEY, NOTES_KEY, TRASH_KEY, LOG_KEY, HIDDEN_KEY, LOVED_KEY, SENDERS_KEY);
    },
  };
}

// ---- backend selection ----

// Cloudflare bindings only exist inside a request, so pick the backend per call:
// Workers KV when FRAME is bound, otherwise the in-memory store.
const memory: Backend = createMemoryBackend();

/** The original single-household store (KV in production before households, memory in tests). */
export function legacyBackend(): Backend { return backend(); }

function backend(): Backend {
  const kv = bindings().FRAME;
  return kv ? createKeyValueBackend(fromWorkersKV(kv)) : memory;
}

export const addPhoto = (p: Omit<FramePhoto, "id" | "at"> & { at?: number }): Promise<FramePhoto> =>
  backend().addPhoto(p);

export const addNote = (n: Omit<FrameNote, "id" | "at"> & { at?: number }): Promise<FrameNote> =>
  backend().addNote(n);

export const getFrame = (now: number = Date.now()): Promise<Frame> => backend().getFrame(now);

export const markLoved = (id: string, at: number = Date.now()): Promise<void> => backend().markLoved(id, at);

export const setHidden = (id: string, hidden: boolean): Promise<boolean> => backend().setHidden(id, hidden);

export const setSender = (id: string, name: string): Promise<boolean> => backend().setSender(id, name);

export const deleteItem = (kind: ItemKind, id: string, now: number = Date.now()): Promise<boolean> =>
  backend().deleteItem(kind, id, now);

export const restoreItem = (kind: ItemKind, id: string): Promise<boolean> => backend().restoreItem(kind, id);

export const getAdmin = (now: number = Date.now()): Promise<AdminView> => backend().getAdmin(now);

export const purgeTrash = (now: number = Date.now()): Promise<string[]> => backend().purgeTrash(now);

/** Test helper — clears all state including seed data. */
export const __resetFrameForTest = (): Promise<void> => backend().reset();
