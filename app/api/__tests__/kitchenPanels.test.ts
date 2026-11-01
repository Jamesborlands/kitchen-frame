import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { GET as panels } from "@/app/api/kitchen/panels/route";
import { POST as love } from "@/app/api/kitchen/photos/love/route";
import { GET as photos } from "@/app/api/kitchen/photos/route";
import { __resetFrameForTest, addNote, addPhoto, getFrame } from "@/lib/frame/store";
import { frameKeyAllows } from "@/lib/kitchen/frameKey";

const lovePost = (id: string) => love(new Request("https://cv.example/api/kitchen/photos/love", { method: "POST", body: JSON.stringify({ id }) }));

beforeEach(async () => {
  await __resetFrameForTest();
  vi.stubEnv("WHATSAPP_TOKEN", "tok");
  vi.stubEnv("WHATSAPP_PHONE_NUMBER_ID", "123");
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe("frame key", () => {
  it("opens the panels and the heart button", () => {
    expect(frameKeyAllows("/api/kitchen/panels", "Bearer k", "k")).toBe(true);
    expect(frameKeyAllows("/api/kitchen/photos/love", "Bearer k", "k")).toBe(true);
  });
});

describe("GET /api/kitchen/panels", () => {
  it("always answers, with the four places and the messages, even with every source down", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    await addNote({ text: "see you sunday", from: "Tom" });
    const body = await (await panels()).json();
    expect(body.places.map((p: { label: string }) => p.label)).toEqual(["Ludlow", "Edinburgh", "Santa Cruz", "Queenstown"]);
    expect(body.notes.map((n: { text: string }) => n.text)).toEqual(["see you sunday"]);
  });
});

describe("hearts from the frame", () => {
  it("the photo list says until when a heart can be sent, and never the phone number", async () => {
    const p = await addPhoto({ url: "/a.jpg", from: "Kate", waFrom: "447700900000", waMessageId: "wamid.1", at: 1_000 });
    const body = await (await photos()).json();
    expect(body.photos[0]).toMatchObject({ id: p.id, lovableUntil: 1_000 + 24 * 3600_000, loved: false });
    expect(JSON.stringify(body)).not.toContain("447700900000");
    expect(JSON.stringify(body)).not.toContain("wamid");
  });

  it("a photo that didn't come from WhatsApp can't get a heart", async () => {
    await addPhoto({ url: "/a.jpg", from: "Sam" });
    expect((await (await photos()).json()).photos[0].lovableUntil).toBeNull();
  });

  it("sends the heart as a WhatsApp reaction, once", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);
    const p = await addPhoto({ url: "/a.jpg", from: "Kate", waFrom: "447700900000", waMessageId: "wamid.1" });
    expect((await lovePost(p.id)).status).toBe(200);
    const sent = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(sent).toMatchObject({ to: "447700900000", type: "reaction", reaction: { message_id: "wamid.1", emoji: "❤️" } });
    expect((await getFrame()).photos[0].lovedAt).toBeTypeOf("number");
    expect((await lovePost(p.id)).status).toBe(409);
    expect(fetchMock).toHaveBeenCalledOnce();
    expect((await (await photos()).json()).photos[0].loved).toBe(true);
  });

  it("explains a heart that's too late", async () => {
    vi.stubGlobal("fetch", vi.fn());
    const p = await addPhoto({ url: "/a.jpg", from: "Kate", waFrom: "4477", waMessageId: "wamid.1", at: Date.now() - 25 * 3600_000 });
    const res = await lovePost(p.id);
    expect(res.status).toBe(409);
    expect((await res.json()).reason).toBe("not-lovable");
  });
});
