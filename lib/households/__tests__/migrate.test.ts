import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { testDb } from "@/lib/db/testing";
import { __setDbForTest, type D1Like } from "@/lib/db/d1";
import { createKeyValueBackend, type Backend, type KeyValueLike } from "@/lib/frame/store";
import { __useD1ForTest, frameStore, householdSettings, householdTodos } from "@/lib/households/data";
import { householdForFrameKey, householdForPin } from "@/lib/households/repo";
import { migrateLegacyHousehold } from "@/lib/households/migrate";
import { defaultSettings } from "@/lib/family/settings";

const NOW = 1_800_000_000_000;
function mapKV(): KeyValueLike {
  const m = new Map<string, unknown>();
  return {
    get: async <T,>(k: string) => (m.has(k) ? (structuredClone(m.get(k)) as T) : null),
    set: async (k, v) => { m.set(k, structuredClone(v)); },
    del: async (...ks) => { ks.forEach((k) => m.delete(k)); },
  };
}

let db: D1Like;
let legacy: Backend;
beforeEach(async () => {
  db = testDb();
  __setDbForTest(db);
  __useD1ForTest(true);
  legacy = createKeyValueBackend(mapKV(), { settle: async () => {}, retryPause: async () => {} });
  const a = await legacy.addPhoto({ url: "/api/photo?k=whatsapp/a.jpg", from: "", at: NOW - 5000, waFrom: "44", waMessageId: "w1" });
  const b = await legacy.addPhoto({ url: "/api/photo?k=whatsapp/b.jpg", from: "Kate", caption: "beach", at: NOW - 4000 });
  const c = await legacy.addPhoto({ url: "/api/photo?k=whatsapp/c.jpg", from: "Tom", at: NOW - 3000 });
  await legacy.addNote({ text: "see you sunday", from: "Tom", at: NOW - 2000 });
  await legacy.setSender(a.id, "Sophie");
  await legacy.markLoved(a.id, NOW - 1000);
  await legacy.setHidden(b.id, true);
  await legacy.deleteItem("photo", c.id, NOW - 500);
});
afterEach(() => __useD1ForTest(null));

const run = () => migrateLegacyHousehold({
  legacy, todos: [{ id: "t1", text: "Ring the plumber", done: false, at: NOW - 100 }],
  settings: { ...defaultSettings(), photoSlideSec: 60 },
  frameKey: "parents-frame-key", sitePin: "1234", secret: "s3cret", now: NOW,
});

describe("moving the parents' KV records into D1 as household ludlow", () => {
  it("photos (ids, senders, hearts, hidden), the bin, notes, log, to-dos, settings, PIN and frame key", async () => {
    const report = await run();
    expect(report).toMatchObject({ photos: 3, notes: 1, todos: 1 });
    const store = frameStore("ludlow");
    const admin = await store.getAdmin(NOW);
    const legacyAdmin = await legacy.getAdmin(NOW);
    expect(admin.photos.map((p) => [p.id, p.from, p.hidden ?? false, p.lovedAt ?? null]))
      .toEqual(legacyAdmin.photos.map((p) => [p.id, p.from, p.hidden ?? false, p.lovedAt ?? null]));
    expect(admin.photos[1]).toMatchObject({ from: "Sophie", waFrom: "44", waMessageId: "w1" });
    expect(admin.trash.map((t) => [t.kind, t.item.id, t.deletedAt])).toEqual(legacyAdmin.trash.map((t) => [t.kind, t.item.id, t.deletedAt]));
    expect((await store.getFrame(NOW)).notes.map((n) => n.text)).toEqual(["see you sunday"]);
    expect(admin.log.length).toBe(legacyAdmin.log.length);
    expect((await householdTodos("ludlow").list(NOW)).map((t) => t.text)).toEqual(["Ring the plumber"]);
    expect((await householdSettings("ludlow")).photoSlideSec).toBe(60);
    expect(await householdForFrameKey("parents-frame-key")).toBe("ludlow");
    expect(await householdForPin("1234", "s3cret")).toBe("ludlow");
  });

  it("running it twice changes nothing", async () => {
    await run();
    await run();
    expect((await frameStore("ludlow").getAdmin(NOW)).photos).toHaveLength(2);
    expect(await householdTodos("ludlow").list(NOW)).toHaveLength(1);
  });
});
