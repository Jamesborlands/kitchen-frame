import { describe, it, expect, beforeEach } from "vitest";
import { testDb } from "@/lib/db/testing";
import type { D1Like } from "@/lib/db/d1";
import { createD1Backend } from "@/lib/frame/d1store";
import { TRASH_KEEP_MS } from "@/lib/frame/store";

const T0 = Date.UTC(2026, 9, 12, 9);
const DAY = 86_400_000;
let db: D1Like;

beforeEach(async () => {
  db = testDb();
  for (const id of ["ludlow", "bristol"]) {
    await db.prepare("INSERT INTO households (id, name, created_at) VALUES (?, ?, 1)").bind(id, id).run();
  }
});

describe("household data on D1", () => {
  it("photos and notes, newest first; notes for a day", async () => {
    const b = createD1Backend(db, "ludlow");
    const a = await b.addPhoto({ url: "/a.jpg", from: "Kate", caption: "beach", at: T0, waFrom: "44", waMessageId: "w1" });
    await b.addPhoto({ url: "/b.jpg", from: "Tom", at: T0 + 1 });
    const n = await b.addNote({ text: "hi", from: "Peter", at: T0 });
    const f = await b.getFrame(T0 + 2);
    expect(f.photos.map((p) => p.url)).toEqual(["/b.jpg", "/a.jpg"]);
    expect(f.photos[1]).toMatchObject({ id: a.id, from: "Kate", caption: "beach", waFrom: "44", waMessageId: "w1" });
    expect(f.notes.map((x) => x.id)).toEqual([n.id]);
    expect((await b.getFrame(T0 + DAY + 1)).notes).toEqual([]);
  });

  it("households never see each other's things", async () => {
    await createD1Backend(db, "ludlow").addPhoto({ url: "/mine.jpg", from: "Kate", at: T0 });
    const other = createD1Backend(db, "bristol");
    expect((await other.getFrame(T0)).photos).toEqual([]);
    const p = (await createD1Backend(db, "ludlow").getFrame(T0)).photos[0];
    expect(await other.deleteItem("photo", p.id, T0)).toBe(false);
    expect(await other.setHidden(p.id, true)).toBe(false);
    expect((await createD1Backend(db, "ludlow").getFrame(T0)).photos).toHaveLength(1);
  });

  it("hide/show, sender names, hearts", async () => {
    const b = createD1Backend(db, "ludlow");
    const p = await b.addPhoto({ url: "/a.jpg", from: "", at: T0 });
    await b.setHidden(p.id, true);
    expect((await b.getFrame(T0)).photos).toEqual([]);
    expect((await b.getAdmin(T0)).photos[0].hidden).toBe(true);
    await b.setHidden(p.id, false);
    await b.setSender(p.id, " Kate ");
    await b.markLoved(p.id, T0 + 5);
    expect((await b.getFrame(T0)).photos[0]).toMatchObject({ from: "Kate", lovedAt: T0 + 5 });
    await b.setSender(p.id, "");
    expect((await b.getFrame(T0)).photos[0].from).toBe("");
  });

  it("delete to the bin, restore, purge after 30 days", async () => {
    const b = createD1Backend(db, "ludlow");
    const p = await b.addPhoto({ url: "/api/photo?k=whatsapp%2Fa.jpg", from: "Kate", at: T0 });
    const n = await b.addNote({ text: "oops", from: "Peter", at: T0 });
    await b.deleteItem("photo", p.id, T0 + 1);
    await b.deleteItem("note", n.id, T0 + 1);
    expect((await b.getFrame(T0 + 2)).photos).toEqual([]);
    const admin = await b.getAdmin(T0 + 2);
    expect(admin.trash.map((t) => [t.kind, t.item.id])).toEqual([["photo", p.id], ["note", n.id]]);
    expect(admin.log.every((e) => e.deleted)).toBe(true);
    expect(admin.log.find((e) => e.kind === "photo")!.url).toBeUndefined();
    await b.restoreItem("note", n.id);
    expect((await b.getFrame(T0 + 3)).notes.map((x) => x.id)).toEqual([n.id]);
    expect(await b.purgeTrash(T0 + 1 + TRASH_KEEP_MS + 1)).toEqual(["whatsapp/a.jpg"]);
    expect((await b.getAdmin(T0 + TRASH_KEEP_MS + 5)).trash).toEqual([]);
    expect(await b.purgeTrash(T0 + TRASH_KEEP_MS + 9)).toEqual([]);
    expect(await b.restoreItem("photo", p.id)).toBe(false); // gone for good
  });

  it("who sent what", async () => {
    const b = createD1Backend(db, "ludlow");
    await b.addPhoto({ url: "/a.jpg", from: "Kate", caption: "beach", at: T0 });
    await b.addNote({ text: "hello", from: "Tom", at: T0 + 1 });
    const log = (await b.getAdmin(T0 + 3 * DAY)).log;
    expect(log.map((e) => [e.kind, e.from, e.text ?? null])).toEqual([["note", "Tom", "hello"], ["photo", "Kate", "beach"]]);
  });
});
