import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { testDb } from "@/lib/db/testing";
import { __setDbForTest } from "@/lib/db/d1";
import { __useD1ForTest, frameStore } from "@/lib/households/data";
import { createHousehold, householdPinVersion, setPin, setWhatsApp } from "@/lib/households/repo";
import { LUDLOW_DEFAULTS } from "@/lib/households/defaults";
import { POST as webhook } from "@/app/api/whatsapp/route";
import { GET as photo } from "@/app/api/photo/route";
import { ingestWhatsAppPhoto } from "@/lib/frame/media";
import { loveFromKitchen } from "@/lib/frame/loveAction";
import { __setBindingsForTest } from "@/lib/cloudflare/bindings";
import { householdCookie } from "@/lib/households/session";

const text = (phoneNumberId: string | undefined, body: string) => webhook(new Request("https://cv.example/api/whatsapp", {
  method: "POST",
  body: JSON.stringify({ entry: [{ changes: [{ value: {
    ...(phoneNumberId ? { metadata: { phone_number_id: phoneNumberId } } : {}),
    contacts: [{ profile: { name: "Sophie" }, wa_id: "447700900001" }],
    messages: [{ type: "text", from: "447700900001", id: `wamid.${body}`, text: { body } }],
  } }] }] }),
}));
const notes = async (h: string) => (await frameStore(h).getFrame(Date.now())).notes.map((n) => n.text);

beforeEach(async () => {
  __setDbForTest(testDb());
  __useD1ForTest(true);
  vi.stubEnv("WHATSAPP_PHONE_NUMBER_ID", "PARENTS-NUMBER");
  vi.stubEnv("WHATSAPP_TOKEN", "tok");
  vi.stubEnv("SESSION_SECRET", "s");
  vi.stubEnv("SITE_PIN", "1234");
  for (const id of ["ludlow", "bristol"]) await createHousehold({ id, name: id, settings: LUDLOW_DEFAULTS() }, 1);
  await setWhatsApp("bristol", "BRISTOL-NUMBER");
  await setPin("bristol", "555555", "s");
});
afterEach(() => { __useD1ForTest(null); __setBindingsForTest(null); vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe("WhatsApp → the household that owns the number", () => {
  it("routes by phone_number_id; the parents' original number (or none) is ludlow; an unknown number is dropped", async () => {
    await text("BRISTOL-NUMBER", "hi from bristol");
    await text("PARENTS-NUMBER", "hi mum");
    await text(undefined, "old payload");
    await text("SOMEONE-ELSE", "spam");
    expect(await notes("bristol")).toEqual(["hi from bristol"]);
    expect((await notes("ludlow")).sort()).toEqual(["hi mum", "old payload"]);
  });

  it("a household's photos are stored under h/<id>/; the parents' stay under whatsapp/", async () => {
    const put = vi.fn(async () => undefined);
    const fetchImpl = vi.fn(async (url: string) => (String(url).includes("graph")
      ? Response.json({ url: "https://cdn/x", mime_type: "image/jpeg" })
      : new Response("bytes"))) as unknown as typeof fetch;
    await ingestWhatsAppPhoto({ id: "M1" }, "Sophie", { put, fetchImpl, token: "t" }, {}, "bristol");
    await ingestWhatsAppPhoto({ id: "M2" }, "Mum", { put, fetchImpl, token: "t" }, {}, "ludlow");
    expect(put.mock.calls.map((c) => (c as unknown[])[0])).toEqual(["h/bristol/whatsapp/M1.jpg", "whatsapp/M2.jpg"]);
    expect((await frameStore("bristol").getFrame(Date.now())).photos.map((p) => p.from)).toEqual(["Sophie"]);
  });

  it("/api/photo only serves a household its own photos", async () => {
    __setBindingsForTest({ PHOTOS: { put: async () => undefined, get: async () => ({ body: new Response("x").body!, httpMetadata: {} }) } } as never);
    const as = async (h: string, k: string) => (await photo(new Request(`https://cv.example/api/photo?k=${encodeURIComponent(k)}`, {
      headers: { cookie: h === "ludlow" ? "cv_session=1234" : `cv_h=${await householdCookie(h, (await householdPinVersion(h))!, "s")}` },
    }))).status;
    expect(await as("bristol", "h/bristol/whatsapp/M1.jpg")).toBe(200);
    expect(await as("bristol", "whatsapp/M2.jpg")).toBe(403);
    expect(await as("ludlow", "h/bristol/whatsapp/M1.jpg")).toBe(403);
    expect(await as("ludlow", "whatsapp/M2.jpg")).toBe(200);
  });

  it("a heart goes out from the household's own number", async () => {
    await frameStore("bristol").addPhoto({ url: "/p.jpg", from: "Sophie", waFrom: "447700900001", waMessageId: "wamid.9" });
    const [p] = (await frameStore("bristol").getFrame(Date.now())).photos;
    const fetchMock = vi.fn(async () => new Response("{}"));
    vi.stubGlobal("fetch", fetchMock);
    const r = await loveFromKitchen(p.id, Date.now(), frameStore("bristol"), "bristol");
    expect(r.status).toBe(200);
    expect(String((fetchMock.mock.calls[0] as unknown[])[0])).toContain("/BRISTOL-NUMBER/messages");
  });
});

describe("the ♥ button", () => {
  it("is only offered to a household with its own number", async () => {
    const { GET: photos } = await import("@/app/api/kitchen/photos/route");
    const { addFrame } = await import("@/lib/households/repo");
    await createHousehold({ id: "gran", name: "Gran", settings: LUDLOW_DEFAULTS() }, 1);
    await addFrame("gran", "gran-key", "kitchen", 1);
    await addFrame("bristol", "bristol-key", "kitchen", 1);
    for (const h of ["gran", "bristol"]) await frameStore(h).addPhoto({ url: "/p.jpg", from: "X", waFrom: "44", waMessageId: `w.${h}` });
    const lovable = async (key: string) => ((await (await photos(new Request("https://cv.example/x", { headers: { authorization: `Bearer ${key}` } }))).json()) as { photos: { lovableUntil: number | null }[] }).photos[0].lovableUntil !== null;
    expect(await lovable("bristol-key")).toBe(true);
    expect(await lovable("gran-key")).toBe(false);
  });
});
