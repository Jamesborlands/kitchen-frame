import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { GET as photos } from "@/app/api/kitchen/photos/route";
import { POST as remove } from "@/app/api/kitchen/photos/remove/route";
import { GET as feed } from "@/app/api/kitchen/feed/route";
import { __resetFrameForTest, addPhoto, getAdmin, getFrame } from "@/lib/frame/store";

const post = (body: string) => new Request("https://cv.example/api/kitchen/photos/remove", { method: "POST", body });

beforeEach(async () => {
  await __resetFrameForTest();
  // the feed's outside sources (weather, warnings, news) fail fast instead of going to the network
  vi.stubGlobal("fetch", async () => new Response("offline", { status: 503 }));
});
afterEach(() => vi.unstubAllGlobals());

describe("GET /api/kitchen/photos", () => {
  it("returns every photo, with the same version the feed advertises", async () => {
    for (let i = 0; i < 50; i++) await addPhoto({ url: `/api/photo?k=${i}.jpg`, from: "Kate", at: 1000 + i, waFrom: "447700900000" });
    const body = await (await photos()).json();
    expect(body.photos).toHaveLength(50);
    expect(body.photos[0]).toEqual({ id: expect.any(String), url: "/api/photo?k=49.jpg", from: "Kate", initials: "KA", at: 1049, lovableUntil: null, loved: false });
    const f = await (await feed()).json();
    expect(f.photosVersion).toBe(body.version);
    expect(JSON.stringify(body)).not.toContain("447700900000");
  });
});

describe("POST /api/kitchen/photos/remove", () => {
  it("moves the photo to the bin, where /family can put it back", async () => {
    const p = await addPhoto({ url: "/a.jpg", from: "Kate" });
    expect((await remove(post(JSON.stringify({ id: p.id })))).status).toBe(200);
    expect((await getFrame()).photos).toEqual([]);
    expect((await getAdmin()).trash.map((t) => t.item.id)).toEqual([p.id]);
  });

  it("rejects nonsense", async () => {
    expect((await remove(post("{bad"))).status).toBe(400);
    expect((await remove(post(JSON.stringify({ id: "nope" })))).status).toBe(404);
  });
});
