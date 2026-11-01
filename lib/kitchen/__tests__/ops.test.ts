import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  parseCheckin, isCommand, recordCheckin, latestCheckin, queueCommand, takeCommand, peekCommand,
  noteDebugUpload, debugMeta, __resetOpsForTest,
} from "@/lib/kitchen/ops";
import { __setBindingsForTest, type KVLike } from "@/lib/cloudflare/bindings";

const good = { versionCode: 3, uptimeS: 60, lastFeedOkAt: 5, freeMemMb: 300, wifiRssi: -55, tailscaleUp: true, lastError: null };

function fakeKV(): KVLike & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    get: async (k) => (data.has(k) ? JSON.parse(data.get(k)!) : null),
    put: async (k, v) => { data.set(k, v); },
    delete: async (k) => { data.delete(k); },
  };
}

beforeEach(async () => { await __resetOpsForTest(); });
afterEach(() => __setBindingsForTest(null));

describe("parseCheckin", () => {
  it("accepts a well-formed check-in", () => {
    expect(parseCheckin(good)).toEqual(good);
  });
  it("accepts nulls where allowed", () => {
    expect(parseCheckin({ ...good, lastFeedOkAt: null, wifiRssi: null, lastError: null })).not.toBeNull();
  });
  it("rejects wrong types, missing fields and junk", () => {
    expect(parseCheckin({ ...good, versionCode: "3" })).toBeNull();
    expect(parseCheckin({ ...good, tailscaleUp: "yes" })).toBeNull();
    const missing: Record<string, unknown> = { ...good };
    delete missing.uptimeS;
    expect(parseCheckin(missing)).toBeNull();
    expect(parseCheckin(null)).toBeNull();
    expect(parseCheckin("hi")).toBeNull();
  });
  it("truncates a very long error so KV stays small", () => {
    expect(parseCheckin({ ...good, lastError: "x".repeat(5000) })!.lastError!.length).toBe(1000);
  });
});

describe("isCommand", () => {
  it("knows the six commands only", () => {
    for (const c of ["reload", "update", "screenshot", "logs", "restart", "openadb"]) expect(isCommand(c)).toBe(true);
    expect(isCommand("rm -rf")).toBe(false);
    expect(isCommand(undefined)).toBe(false);
  });
});

describe("check-in and commands (memory backend)", () => {
  it("stores the latest check-in with its time", async () => {
    await recordCheckin(good, 100);
    expect(await latestCheckin()).toEqual({ ...good, at: 100 });
  });

  it("delivers a queued command exactly once", async () => {
    await queueCommand("update");
    expect(await peekCommand()).toBe("update");
    expect(await takeCommand()).toBe("update");
    expect(await takeCommand()).toBeNull();
  });

  it("remembers debug upload times per kind", async () => {
    await noteDebugUpload("screenshot", 7);
    expect(await debugMeta()).toEqual({ screenshotAt: 7, logsAt: null });
  });
});

describe("check-in and commands (KV backend)", () => {
  it("uses the FRAME namespace when bound", async () => {
    const kv = fakeKV();
    __setBindingsForTest({ FRAME: kv });
    await recordCheckin(good, 1);
    await queueCommand("logs");
    expect(kv.data.has("frame:checkin")).toBe(true);
    expect(await takeCommand()).toBe("logs");
    expect(kv.data.has("frame:command")).toBe(false);
  });
});
