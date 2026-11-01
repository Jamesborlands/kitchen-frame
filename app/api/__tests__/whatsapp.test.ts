import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { verifyChallenge, POST } from "@/app/api/whatsapp/route";
import { getFrame, __resetFrameForTest } from "@/lib/frame/store";

function imagePayload(caption?: string) {
  return {
    entry: [
      {
        changes: [
          {
            value: {
              contacts: [{ profile: { name: "Kate" }, wa_id: "447700900000" }],
              messages: [
                {
                  type: "image",
                  from: "447700900000",
                  id: "wamid.1",
                  image: { id: "MID", mime_type: "image/jpeg", sha256: "x", caption },
                },
              ],
            },
          },
        ],
      },
    ],
  };
}

function postJson(body: unknown) {
  const req = new Request("https://example.com/api/whatsapp", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
  return POST(req);
}

// ---- verifyChallenge unit tests ----

function makeParams(overrides: Record<string, string> = {}): URLSearchParams {
  const defaults: Record<string, string> = {
    "hub.mode": "subscribe",
    "hub.verify_token": "correct-token",
    "hub.challenge": "abc123",
  };
  return new URLSearchParams({ ...defaults, ...overrides });
}

describe("verifyChallenge", () => {
  it("returns null when envToken is undefined", () => {
    const params = makeParams();
    expect(verifyChallenge(params, undefined)).toBeNull();
  });

  it("returns null when envToken is empty string", () => {
    const params = makeParams();
    expect(verifyChallenge(params, "")).toBeNull();
  });

  it("returns null on token mismatch", () => {
    const params = makeParams({ "hub.verify_token": "wrong-token" });
    expect(verifyChallenge(params, "correct-token")).toBeNull();
  });

  it("returns null when mode is not subscribe", () => {
    const params = makeParams({ "hub.mode": "unsubscribe" });
    expect(verifyChallenge(params, "correct-token")).toBeNull();
  });

  it("returns null when challenge is missing", () => {
    const params = new URLSearchParams({
      "hub.mode": "subscribe",
      "hub.verify_token": "correct-token",
    });
    expect(verifyChallenge(params, "correct-token")).toBeNull();
  });

  it("returns the challenge string when mode, token, and challenge all match", () => {
    const params = makeParams();
    expect(verifyChallenge(params, "correct-token")).toBe("abc123");
  });
});

// ---- POST handler: returns 200 even on malformed body ----

describe("POST /api/whatsapp", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns 200 when request.json() rejects (malformed body)", async () => {
    const req = new Request("https://example.com/api/whatsapp", {
      method: "POST",
      body: "not-json",
      headers: { "Content-Type": "application/json" },
    });
    // Override json() to simulate a parse failure
    vi.spyOn(req, "json").mockRejectedValue(new SyntaxError("Unexpected token"));

    const response = await POST(req);
    expect(response.status).toBe(200);
  });

  it("returns 200 for an empty JSON object body", async () => {
    const req = new Request("https://example.com/api/whatsapp", {
      method: "POST",
      body: JSON.stringify({}),
      headers: { "Content-Type": "application/json" },
    });
    const response = await POST(req);
    expect(response.status).toBe(200);
  });
});

describe("POST /api/whatsapp image handling (storage unconfigured)", () => {
  beforeEach(async () => {
    await __resetFrameForTest();
  });
  afterEach(() => vi.restoreAllMocks());

  it("falls back to a captioned placeholder note when blob storage is off", async () => {
    const res = await postJson(imagePayload("morning swim"));
    expect(res.status).toBe(200);
    const frame = await getFrame();
    expect(frame.notes[0]).toMatchObject({ text: "📷 morning swim", from: "Kate" });
    // No photo is stored without blob/token configured
    expect(frame.photos).toHaveLength(0);
  });

  it("uses a generic placeholder note when the photo has no caption", async () => {
    const res = await postJson(imagePayload());
    expect(res.status).toBe(200);
    expect((await getFrame()).notes[0]).toMatchObject({ text: "sent a photo", from: "Kate" });
  });
});

describe("POST /api/whatsapp — one bad message doesn't drop the rest", () => {
  beforeEach(async () => { await __resetFrameForTest(); });
  afterEach(async () => {
    const { __setBindingsForTest } = await import("@/lib/cloudflare/bindings");
    __setBindingsForTest(null);
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("a message whose save is refused still lets the next one through", async () => {
    const { __setBindingsForTest } = await import("@/lib/cloudflare/bindings");
    const data = new Map<string, string>();
    let refused = false;
    __setBindingsForTest({
      FRAME: {
        get: async (k: string) => (data.has(k) ? JSON.parse(data.get(k)!) : null),
        put: async (k: string, v: string) => {
          if (k === "frame:notes" && !refused) { refused = true; throw new Error("KV PUT failed: 429"); }
          data.set(k, v);
        },
        delete: async (k: string) => { data.delete(k); },
      },
    });
    const text = (id: string, body: string) => ({ type: "text", from: "447700900000", id, text: { body } });
    const body = imagePayload();
    body.entry[0].changes[0].value.messages = [text("wamid.1", "first"), text("wamid.2", "second")] as never;
    expect((await postJson(body)).status).toBe(200);
    expect((await getFrame()).notes.map((n) => n.text)).toEqual(["second"]);
  });
});
