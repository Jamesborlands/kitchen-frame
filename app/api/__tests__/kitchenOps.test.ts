import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { POST as checkin } from "@/app/api/kitchen/checkin/route";
import { POST as command } from "@/app/api/kitchen/command/route";
import { POST as upload } from "@/app/api/kitchen/upload/route";
import { GET as debug } from "@/app/api/kitchen/debug/route";
import { GET as status } from "@/app/api/kitchen/status/route";
import { __resetOpsForTest, latestCheckin } from "@/lib/kitchen/ops";
import { __setBindingsForTest, type R2Like } from "@/lib/cloudflare/bindings";

const good = { versionCode: 3, uptimeS: 60, lastFeedOkAt: 5, freeMemMb: 300, wifiRssi: -55, tailscaleUp: true, lastError: null };
const post = (url: string, body: BodyInit) => new Request(`https://cv.example${url}`, { method: "POST", body });

function fakeR2(): R2Like & { data: Map<string, { bytes: ArrayBuffer; type?: string }> } {
  const data = new Map<string, { bytes: ArrayBuffer; type?: string }>();
  return {
    data,
    put: async (k, v, o) => { data.set(k, { bytes: v, type: o?.httpMetadata?.contentType }); },
    get: async (k) => {
      const d = data.get(k);
      return d ? { body: new Response(d.bytes).body!, httpMetadata: { contentType: d.type } } : null;
    },
  };
}

beforeEach(async () => { await __resetOpsForTest(); });
afterEach(() => __setBindingsForTest(null));

describe("POST /api/kitchen/checkin", () => {
  it("stores the check-in and hands over the pending command once", async () => {
    await command(post("/api/kitchen/command", JSON.stringify({ command: "update" })));
    const first = await checkin(post("/api/kitchen/checkin", JSON.stringify(good)));
    expect(await first.json()).toEqual({ command: "update" });
    const second = await checkin(post("/api/kitchen/checkin", JSON.stringify(good)));
    expect(await second.json()).toEqual({ command: null });
    expect((await latestCheckin())?.versionCode).toBe(3);
  });

  it("rejects a bad body without touching the last good check-in", async () => {
    await checkin(post("/api/kitchen/checkin", JSON.stringify(good)));
    const res = await checkin(post("/api/kitchen/checkin", "{not json"));
    expect(res.status).toBe(400);
    const res2 = await checkin(post("/api/kitchen/checkin", JSON.stringify({ ...good, versionCode: "x" })));
    expect(res2.status).toBe(400);
    expect((await latestCheckin())?.versionCode).toBe(3);
  });

  it("does not hand over a command when the check-in is rejected", async () => {
    await command(post("/api/kitchen/command", JSON.stringify({ command: "restart" })));
    await checkin(post("/api/kitchen/checkin", "junk"));
    const ok = await checkin(post("/api/kitchen/checkin", JSON.stringify(good)));
    expect(await ok.json()).toEqual({ command: "restart" });
  });
});

describe("POST /api/kitchen/command", () => {
  it("rejects unknown commands", async () => {
    expect((await command(post("/api/kitchen/command", JSON.stringify({ command: "format" })))).status).toBe(400);
    expect((await command(post("/api/kitchen/command", "nope"))).status).toBe(400);
  });
});

describe("uploads and debug", () => {
  it("stores a screenshot in R2 and serves it back", async () => {
    const r2 = fakeR2();
    __setBindingsForTest({ PHOTOS: r2 });
    const res = await upload(post("/api/kitchen/upload?kind=screenshot", new Uint8Array([1, 2, 3])));
    expect(res.status).toBe(200);
    expect(r2.data.get("frame-debug/screenshot.png")?.type).toBe("image/png");
    const got = await debug(new Request("https://cv.example/api/kitchen/debug?kind=screenshot"));
    expect(got.status).toBe(200);
    expect(new Uint8Array(await got.arrayBuffer())).toEqual(new Uint8Array([1, 2, 3]));
    expect((await (await status()).json()).debug.screenshotAt).toBeTypeOf("number");
  });

  it("rejects bad kinds, oversize bodies, and missing R2", async () => {
    __setBindingsForTest({ PHOTOS: fakeR2() });
    expect((await upload(post("/api/kitchen/upload?kind=evil", "x"))).status).toBe(400);
    expect((await upload(post("/api/kitchen/upload?kind=logs", new Uint8Array(5 * 1024 * 1024 + 1)))).status).toBe(413);
    __setBindingsForTest({});
    expect((await upload(post("/api/kitchen/upload?kind=logs", "x"))).status).toBe(502);
    expect((await debug(new Request("https://cv.example/api/kitchen/debug?kind=logs"))).status).toBe(404);
  });
});

describe("GET /api/kitchen/status", () => {
  it("reports the check-in, pending command and debug times", async () => {
    await checkin(post("/api/kitchen/checkin", JSON.stringify(good)));
    await command(post("/api/kitchen/command", JSON.stringify({ command: "logs" })));
    const body = await (await status()).json();
    expect(body.checkin.versionCode).toBe(3);
    expect(body.pendingCommand).toBe("logs");
    expect(body.debug).toEqual({ screenshotAt: null, logsAt: null });
  });
});
