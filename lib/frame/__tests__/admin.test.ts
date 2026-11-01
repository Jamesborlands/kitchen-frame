import { describe, it, expect, vi, afterEach } from "vitest";
import {
  createKeyValueBackend,
  selectFrame,
  photoKeyFromUrl,
  TRASH_KEEP_MS,
  MAX_LOG,
  withPhoto,
  MAX_PHOTOS,
  type KeyValueLike,
} from "@/lib/frame/store";

const NO_PAUSE = { settle: async () => {}, retryPause: async () => {} };

function memKV(): KeyValueLike {
  const m = new Map<string, string>();
  return {
    async get<T>(k: string) { return m.has(k) ? (JSON.parse(m.get(k)!) as T) : null; },
    async set(k, v) { m.set(k, JSON.stringify(v)); },
    async del(...ks) { ks.forEach((k) => m.delete(k)); },
  };
}

const DAY = 86_400_000;
const T0 = Date.UTC(2026, 9, 12, 9);

describe("hide / show", () => {
  it("a hidden photo stays in the admin view but leaves the frame", async () => {
    const b = createKeyValueBackend(memKV(), NO_PAUSE);
    const p = await b.addPhoto({ url: "/a.jpg", from: "Kate", at: T0 });
    await b.setHidden(p.id, true);
    expect((await b.getFrame(T0)).photos).toEqual([]);
    expect((await b.getAdmin(T0)).photos.map((x) => [x.id, x.hidden])).toEqual([[p.id, true]]);
    await b.setHidden(p.id, false);
    expect((await b.getFrame(T0)).photos.map((x) => x.id)).toEqual([p.id]);
  });

  it("selectFrame never returns hidden photos", () => {
    const f = selectFrame([{ id: "1", url: "u", from: "a", at: 1, hidden: true }, { id: "2", url: "u", from: "a", at: 2 }], [], 3);
    expect(f.photos.map((p) => p.id)).toEqual(["2"]);
  });
});

describe("delete / restore", () => {
  it("deleting a photo moves it to the bin; restoring brings it back", async () => {
    const b = createKeyValueBackend(memKV(), NO_PAUSE);
    const p = await b.addPhoto({ url: "/a.jpg", from: "Kate", at: T0 });
    expect(await b.deleteItem("photo", p.id, T0 + 1)).toBe(true);
    expect((await b.getFrame(T0 + 2)).photos).toEqual([]);
    const admin = await b.getAdmin(T0 + 2);
    expect(admin.trash).toEqual([{ kind: "photo", item: p, deletedAt: T0 + 1 }]);
    expect(await b.restoreItem("photo", p.id)).toBe(true);
    expect((await b.getFrame(T0 + 3)).photos).toEqual([p]);
    expect((await b.getAdmin(T0 + 3)).trash).toEqual([]);
  });

  afterEach(() => vi.useRealTimers());

  it("deleting a message takes it off the board", async () => {
    // addNote drops notes older than 24h against the real clock, so pin it to T0
    vi.useFakeTimers({ now: T0 });
    const b = createKeyValueBackend(memKV(), NO_PAUSE);
    const n = await b.addNote({ text: "hi", from: "Tom", at: T0 });
    await b.deleteItem("note", n.id, T0 + 1);
    expect((await b.getFrame(T0 + 2)).notes).toEqual([]);
    await b.restoreItem("note", n.id);
    expect((await b.getFrame(T0 + 3)).notes).toEqual([n]);
  });

  it("unknown ids are a no-op", async () => {
    const b = createKeyValueBackend(memKV(), NO_PAUSE);
    expect(await b.deleteItem("photo", "nope", T0)).toBe(false);
    expect(await b.restoreItem("note", "nope")).toBe(false);
  });

  it("purgeTrash drops items older than 30 days and returns their stored photo keys", async () => {
    const b = createKeyValueBackend(memKV(), NO_PAUSE);
    const old = await b.addPhoto({ url: "/api/photo?k=frame%2Fold.jpg", from: "Kate", at: T0 });
    const recent = await b.addPhoto({ url: "/api/photo?k=frame%2Fnew.jpg", from: "Kate", at: T0 });
    await b.deleteItem("photo", old.id, T0);
    await b.deleteItem("photo", recent.id, T0 + 20 * DAY);
    const keys = await b.purgeTrash(T0 + TRASH_KEEP_MS + 1);
    expect(keys).toEqual(["frame/old.jpg"]);
    expect((await b.getAdmin(T0 + TRASH_KEEP_MS + 1)).trash.map((t) => t.item.id)).toEqual([recent.id]);
  });
});

describe("log", () => {
  it("records who sent what, newest first, and outlives the board's 24h", async () => {
    const b = createKeyValueBackend(memKV(), NO_PAUSE);
    await b.addPhoto({ url: "/a.jpg", from: "Kate", caption: "beach", at: T0 });
    await b.addNote({ text: "hello", from: "Tom", at: T0 + 1 });
    const log = (await b.getAdmin(T0 + 3 * DAY)).log;
    expect(log.map((e) => [e.kind, e.from, e.text ?? null, e.url ?? null])).toEqual([
      ["note", "Tom", "hello", null],
      ["photo", "Kate", "beach", "/a.jpg"],
    ]);
  });

  it("keeps the newest entries only", async () => {
    const b = createKeyValueBackend(memKV(), NO_PAUSE);
    for (let i = 0; i < MAX_LOG + 5; i++) await b.addNote({ text: `n${i}`, from: "A", at: T0 + i });
    const log = (await b.getAdmin(T0 + MAX_LOG + 10)).log;
    expect(log).toHaveLength(MAX_LOG);
    expect(log[0].text).toBe(`n${MAX_LOG + 4}`);
  });
});

describe("photoKeyFromUrl", () => {
  it("reads the R2 key out of a stored photo url", () => {
    expect(photoKeyFromUrl("/api/photo?k=frame%2Fa.jpg")).toBe("frame/a.jpg");
    expect(photoKeyFromUrl("/watercolor/bramble.webp")).toBeNull();
  });
});

describe("parents never rewrite the lists WhatsApp writes to", () => {
  // the webhook and /family both read-modify-write; if parents only touch their own
  // keys, a photo arriving mid-delete can't be lost and a deleted one can't come back
  function spyKV() {
    const kv = memKV();
    const writes: string[] = [];
    return { kv: { ...kv, set: async (k: string, v: unknown) => { writes.push(k); return kv.set(k, v); } }, writes };
  }

  it("hide, show, delete and restore leave frame:photos and frame:notes alone", async () => {
    const { kv, writes } = spyKV();
    const b = createKeyValueBackend(kv, NO_PAUSE);
    const p = await b.addPhoto({ url: "/a.jpg", from: "Kate", at: T0 });
    const n = await b.addNote({ text: "hi", from: "Tom", at: T0 });
    writes.length = 0;
    await b.setHidden(p.id, true);
    await b.setHidden(p.id, false);
    await b.deleteItem("photo", p.id, T0 + 1);
    await b.restoreItem("photo", p.id);
    await b.deleteItem("note", n.id, T0 + 1);
    await b.restoreItem("note", n.id);
    expect(writes.filter((k) => k === "frame:photos" || k === "frame:notes")).toEqual([]);
  });

  it("a photo arriving after a delete is kept, and the deleted one stays gone", async () => {
    const b = createKeyValueBackend(memKV(), NO_PAUSE);
    const a = await b.addPhoto({ url: "/a.jpg", from: "Kate", at: T0 });
    await b.deleteItem("photo", a.id, T0 + 1);
    const c = await b.addPhoto({ url: "/c.jpg", from: "Tom", at: T0 + 2 });
    expect((await b.getFrame(T0 + 3)).photos.map((x) => x.id)).toEqual([c.id]);
  });

  it("a photo purged from the bin never comes back to the frame", async () => {
    const b = createKeyValueBackend(memKV(), NO_PAUSE);
    const a = await b.addPhoto({ url: "/api/photo?k=frame%2Fa.jpg", from: "Kate", at: T0 });
    await b.deleteItem("photo", a.id, T0);
    await b.purgeTrash(T0 + TRASH_KEEP_MS + 1);
    expect((await b.getFrame(T0 + TRASH_KEEP_MS + 2)).photos).toEqual([]);
    expect((await b.getAdmin(T0 + TRASH_KEEP_MS + 2)).photos).toEqual([]);
    expect((await b.getAdmin(T0 + TRASH_KEEP_MS + 2)).trash).toEqual([]);
    expect(await b.purgeTrash(T0 + TRASH_KEEP_MS + 3)).toEqual([]); // bytes deleted once
  });
});

describe("the log after a delete", () => {
  it("still says who sent something, but not what it was", async () => {
    const b = createKeyValueBackend(memKV(), NO_PAUSE);
    const p = await b.addPhoto({ url: "/a.jpg", from: "Kate", caption: "oops", at: T0 });
    await b.deleteItem("photo", p.id, T0 + 1);
    const [e] = (await b.getAdmin(T0 + 2)).log;
    expect(e).toMatchObject({ id: p.id, from: "Kate", kind: "photo", deleted: true });
    expect(e.url).toBeUndefined();
    expect(e.text).toBeUndefined();
    await b.restoreItem("photo", p.id);
    expect((await b.getAdmin(T0 + 3)).log[0]).toMatchObject({ url: "/a.jpg", text: "oops" });
  });
});

describe("keeping every photo", () => {
  it("only a safety limit far above real use", () => {
    expect(MAX_PHOTOS).toBeGreaterThanOrEqual(5000);
    let photos: ReturnType<typeof withPhoto>["photos"] = [];
    for (let i = 0; i < 300; i++) photos = withPhoto(photos, { url: `/${i}.jpg`, from: "a", at: i }).photos;
    expect(photos).toHaveLength(300);
  });
});

describe("photos arriving at the same moment (a WhatsApp album)", () => {
  it("a photo overwritten by a simultaneous save is put back", async () => {
    const kv = memKV();
    let clobbered = false;
    // the first time our photo is saved, a second webhook (which read the list
    // before our save) writes its own version over it
    const racing: KeyValueLike = {
      ...kv,
      async set(k, v) {
        await kv.set(k, v);
        if (k === "frame:photos" && !clobbered) {
          clobbered = true;
          await kv.set(k, [{ id: "other", url: "/o.jpg", from: "Tom", at: T0 - 1 }]);
        }
      },
    };
    const b = createKeyValueBackend(racing, { settle: async () => {} });
    const p = await b.addPhoto({ url: "/mine.jpg", from: "Kate", at: T0 });
    const ids = (await b.getFrame(T0)).photos.map((x) => x.id);
    expect(ids).toEqual([p.id, "other"]);
  });
});

describe("hearts never rewrite the photo list", () => {
  it("markLoved leaves frame:photos alone, and the heart still shows", async () => {
    const kv = memKV();
    const writes: string[] = [];
    const spy: KeyValueLike = { ...kv, set: async (k, v) => { writes.push(k); return kv.set(k, v); } };
    const b = createKeyValueBackend(spy, NO_PAUSE);
    const p = await b.addPhoto({ url: "/a.jpg", from: "Kate", at: T0, waFrom: "44", waMessageId: "w" });
    writes.length = 0;
    await b.markLoved(p.id, T0 + 5);
    expect(writes).not.toContain("frame:photos");
    expect((await b.getFrame(T0 + 6)).photos[0].lovedAt).toBe(T0 + 5);
  });

  it("a photo arriving while a heart is sent is kept", async () => {
    const b = createKeyValueBackend(memKV(), NO_PAUSE);
    const old = await b.addPhoto({ url: "/old.jpg", from: "Kate", at: T0 });
    await b.markLoved(old.id, T0 + 1);
    const fresh = await b.addPhoto({ url: "/new.jpg", from: "Tom", at: T0 + 2 });
    expect((await b.getFrame(T0 + 3)).photos.map((x) => x.id)).toEqual([fresh.id, old.id]);
  });
});

describe("Cloudflare's one-write-a-second limit", () => {
  it("a rate-limited save is tried again, not lost", async () => {
    const kv = memKV();
    let refused = 0;
    const limited: KeyValueLike = {
      ...kv,
      async set(k, v) {
        if (k === "frame:photos" && refused < 2) { refused++; throw new Error("KV PUT failed: 429 Too Many Requests"); }
        return kv.set(k, v);
      },
    };
    const b = createKeyValueBackend(limited, NO_PAUSE);
    const p = await b.addPhoto({ url: "/a.jpg", from: "Kate", at: T0 });
    expect((await b.getFrame(T0)).photos.map((x) => x.id)).toEqual([p.id]);
  });
});

describe("who sent this", () => {
  it("names a photo whose sender was lost, without rewriting the photo list", async () => {
    const kv = memKV();
    const writes: string[] = [];
    const spy: KeyValueLike = { ...kv, set: async (k, v) => { writes.push(k); return kv.set(k, v); } };
    const b = createKeyValueBackend(spy, NO_PAUSE);
    const p = await b.addPhoto({ url: "/a.jpg", from: "", at: T0 });
    writes.length = 0;
    expect(await b.setSender(p.id, "  Kate  ")).toBe(true);
    expect(writes).not.toContain("frame:photos");
    expect((await b.getFrame(T0)).photos[0].from).toBe("Kate");
    expect((await b.getAdmin(T0)).photos[0].from).toBe("Kate");
  });

  it("can correct a name, and clearing it goes back to what WhatsApp said", async () => {
    const b = createKeyValueBackend(memKV(), NO_PAUSE);
    const p = await b.addPhoto({ url: "/a.jpg", from: "Hol", at: T0 });
    await b.setSender(p.id, "Kate");
    expect((await b.getFrame(T0)).photos[0].from).toBe("Kate");
    await b.setSender(p.id, "");
    expect((await b.getFrame(T0)).photos[0].from).toBe("Hol");
  });

  it("unknown photo: no", async () => {
    const b = createKeyValueBackend(memKV(), NO_PAUSE);
    expect(await b.setSender("nope", "Kate")).toBe(false);
  });
});

