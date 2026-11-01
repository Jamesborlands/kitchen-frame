import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { POST } from "@/app/api/frame/love/route";
import { GET } from "@/app/api/frame/route";
import { addPhoto, getFrame, __resetFrameForTest } from "@/lib/frame/store";

function love(body: unknown) {
  return POST(new Request("https://example.com/api/frame/love", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  }));
}

beforeEach(async () => {
  await __resetFrameForTest();
  vi.stubEnv("WHATSAPP_TOKEN", "tok");
  vi.stubEnv("WHATSAPP_PHONE_NUMBER_ID", "123");
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("POST /api/frame/love", () => {
  it("sends the heart and remembers it", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);
    const p = await addPhoto({ url: "/a.webp", from: "Kate", waFrom: "447700900000", waMessageId: "wamid.1" });

    const res = await love({ id: p.id });
    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledOnce();
    expect((await getFrame()).photos[0].lovedAt).toBeTypeOf("number");

    // a second tap doesn't send again
    expect((await love({ id: p.id })).status).toBe(409);
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("is off until WhatsApp sending is configured", async () => {
    vi.stubEnv("WHATSAPP_PHONE_NUMBER_ID", "");
    expect((await love({ id: "x" })).status).toBe(503);
  });

  it("rejects unknown photos and bad bodies", async () => {
    expect((await love({ id: "nope" })).status).toBe(404);
    expect((await love({})).status).toBe(400);
  });

  it("doesn't mark the photo loved when WhatsApp refuses", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));
    const p = await addPhoto({ url: "/a.webp", from: "Kate", waFrom: "447700900000", waMessageId: "wamid.1" });
    expect((await love({ id: p.id })).status).toBe(502);
    expect((await getFrame()).photos[0].lovedAt).toBeUndefined();
  });
});

describe("GET /api/frame", () => {
  it("hides phone numbers and says which photos can be loved", async () => {
    await addPhoto({ url: "/a.webp", from: "Kate", waFrom: "447700900000", waMessageId: "wamid.1" });
    const body = await (await GET()).json();
    expect(body.photos[0]).not.toHaveProperty("waFrom");
    expect(body.photos[0]).toMatchObject({ lovable: true, loved: false });
  });
});
