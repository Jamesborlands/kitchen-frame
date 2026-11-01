import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  addNote,
  addPhoto,
  getFrame,
  __resetFrameForTest,
  createKeyValueBackend,
  fromWorkersKV,
  type KeyValueLike,
} from "@/lib/frame/store";

const NO_PAUSE = { settle: async () => {}, retryPause: async () => {} };
import { __setBindingsForTest } from "@/lib/cloudflare/bindings";

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

/** A minimal stand-in for a Workers KV namespace: string values, like the real
 *  one, so the JSON round-trip in fromWorkersKV is exercised too. */
function fakeWorkersKV() {
  const store = new Map<string, string>();
  return {
    store,
    async get(key: string) {
      return store.has(key) ? JSON.parse(store.get(key)!) : null;
    },
    async put(key: string, value: string) {
      store.set(key, value);
    },
    async delete(key: string) {
      store.delete(key);
    },
  };
}

function fakeKV(): KeyValueLike & { store: Map<string, string> } {
  const kv = fakeWorkersKV();
  return Object.assign(fromWorkersKV(kv), { store: kv.store });
}

beforeEach(async () => {
  await __resetFrameForTest();
});

describe("addNote / getFrame notes", () => {
  it("returns a note just added", async () => {
    await addNote({ text: "hello family", from: "Sam" });
    const { notes } = await getFrame();
    expect(notes).toHaveLength(1);
    expect(notes[0].text).toBe("hello family");
    expect(notes[0].from).toBe("Sam");
    expect(typeof notes[0].id).toBe("string");
    expect(typeof notes[0].at).toBe("number");
  });

  it("filters out notes older than 24h", async () => {
    const old = Date.now() - DAY - HOUR;
    await addNote({ text: "stale note", from: "Kate", at: old });
    await addNote({ text: "fresh note", from: "Tom" });
    const { notes } = await getFrame();
    expect(notes).toHaveLength(1);
    expect(notes[0].text).toBe("fresh note");
  });

  it("getFrame(now) uses the passed timestamp for filtering", async () => {
    const customNow = Date.now() + DAY * 2;
    await addNote({ text: "will be stale", from: "Sam" });
    const { notes } = await getFrame(customNow);
    expect(notes).toHaveLength(0);
  });

  it("returns notes newest-first", async () => {
    await addNote({ text: "first", from: "Sam", at: Date.now() - 2 * HOUR });
    await addNote({ text: "second", from: "Kate", at: Date.now() - HOUR });
    const { notes } = await getFrame();
    expect(notes[0].text).toBe("second");
    expect(notes[1].text).toBe("first");
  });

  it("excludes a note at exactly the 24h boundary (strict >)", async () => {
    const exactCutoff = Date.now() - DAY;
    await addNote({ text: "boundary note", from: "Tom", at: exactCutoff });
    const { notes } = await getFrame();
    expect(notes).toHaveLength(0);
  });
});

describe("addPhoto / getFrame photos", () => {
  it("returns a photo just added", async () => {
    await addPhoto({ url: "/watercolor/bramble.webp", from: "Sam", caption: "swim" });
    const { photos } = await getFrame();
    expect(photos).toHaveLength(1);
    expect(photos[0].url).toBe("/watercolor/bramble.webp");
    expect(photos[0].caption).toBe("swim");
  });

  it("returns photos newest-first", async () => {
    await addPhoto({ url: "/a.webp", from: "Sam", at: Date.now() - 2 * HOUR });
    await addPhoto({ url: "/b.webp", from: "Kate", at: Date.now() - HOUR });
    const { photos } = await getFrame();
    expect(photos[0].url).toBe("/b.webp");
    expect(photos[1].url).toBe("/a.webp");
  });

  it("keeps every photo, newest first", async () => {
    for (let i = 0; i < 45; i++) {
      await addPhoto({ url: `/photo-${i}.webp`, from: "Sam", at: Date.now() + i });
    }
    const { photos } = await getFrame();
    expect(photos).toHaveLength(45);
    expect(photos[0].url).toBe("/photo-44.webp");
    expect(photos.at(-1)!.url).toBe("/photo-0.webp");
  });
});

describe("__resetFrameForTest", () => {
  it("clears all data between tests", async () => {
    await addNote({ text: "temp", from: "Sam" });
    await addPhoto({ url: "/x.webp", from: "Kate" });
    await __resetFrameForTest();
    const { photos, notes } = await getFrame();
    expect(photos).toHaveLength(0);
    expect(notes).toHaveLength(0);
  });
});

describe("Workers KV backend (durable store)", () => {
  it("persists a note via get/set and reads it back", async () => {
    const kv = fakeKV();
    const backend = createKeyValueBackend(kv, NO_PAUSE);
    await backend.addNote({ text: "durable hi", from: "Kate" });
    const { notes } = await backend.getFrame(Date.now());
    expect(notes).toHaveLength(1);
    expect(notes[0].text).toBe("durable hi");
    // round-tripped through the KV key, not module memory
    expect(kv.store.has("frame:notes")).toBe(true);
  });

  it("accumulates across separate backend instances sharing one client", async () => {
    const kv = fakeKV();
    await createKeyValueBackend(kv, NO_PAUSE).addPhoto({ url: "/a.webp", from: "Sam" });
    // a fresh backend (simulating a new serverless invocation) sees the prior write
    const { photos } = await createKeyValueBackend(kv, NO_PAUSE).getFrame(Date.now());
    expect(photos).toHaveLength(1);
    expect(photos[0].url).toBe("/a.webp");
  });

  it("returns every photo newest-first", async () => {
    const kv = fakeKV();
    const backend = createKeyValueBackend(kv, NO_PAUSE);
    for (let i = 0; i < 45; i++) {
      await backend.addPhoto({ url: `/p-${i}.webp`, from: "Sam", at: Date.now() + i });
    }
    const { photos } = await backend.getFrame(Date.now());
    expect(photos).toHaveLength(45);
    expect(photos[0].url).toBe("/p-44.webp");
  });

  it("filters notes older than 24h on read", async () => {
    const kv = fakeKV();
    const backend = createKeyValueBackend(kv, NO_PAUSE);
    await backend.addNote({ text: "fresh", from: "Tom" });
    const { notes } = await backend.getFrame(Date.now() + DAY * 2);
    expect(notes).toHaveLength(0);
  });

  it("reset clears the KV keys", async () => {
    const kv = fakeKV();
    const backend = createKeyValueBackend(kv, NO_PAUSE);
    await backend.addNote({ text: "temp", from: "Sam" });
    await backend.reset();
    expect(kv.store.has("frame:notes")).toBe(false);
    const { notes } = await backend.getFrame(Date.now());
    expect(notes).toHaveLength(0);
  });
});

describe("seed data (module-level auto-seed)", () => {
  it("seeds the demo family's 8 photos and 3 messages on fresh module load", async () => {
    vi.resetModules();
    const fresh = await import("@/lib/frame/store");
    const { photos, notes } = await fresh.getFrame();
    expect(photos).toHaveLength(8);
    expect(photos.every((p) => p.url.startsWith("/demo/"))).toBe(true);
    expect(photos[0]).toMatchObject({ url: "/demo/santacruz-dog.jpg", from: "Sam" }); // newest first
    expect(notes).toHaveLength(3);
    expect(notes.map((n) => n.from)).toEqual(expect.arrayContaining(["Peter", "Kate", "Tom"]));
    // Clean up
    await fresh.__resetFrameForTest();
  });
});

describe("markLoved", () => {
  it("marks one photo loved in the KV backend", async () => {
    const kv = fakeKV();
    const backend = createKeyValueBackend(kv, NO_PAUSE);
    const a = await backend.addPhoto({ url: "/a.webp", from: "Kate" });
    const b = await backend.addPhoto({ url: "/b.webp", from: "Sam" });
    await backend.markLoved(a.id, 123);
    const { photos } = await backend.getFrame(Date.now());
    expect(photos.find((p) => p.id === a.id)?.lovedAt).toBe(123);
    expect(photos.find((p) => p.id === b.id)?.lovedAt).toBeUndefined();
  });
});

describe("backend selection", () => {
  it("uses Workers KV when the FRAME namespace is bound", async () => {
    const kv = fakeWorkersKV();
    __setBindingsForTest({ FRAME: kv });
    try {
      await addNote({ text: "via kv", from: "Kate" });
      expect(kv.store.has("frame:notes")).toBe(true);
    } finally {
      __setBindingsForTest(null);
    }
  });
});
