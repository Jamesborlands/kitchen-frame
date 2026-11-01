import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { GET as family } from "@/app/api/family/route";
import { POST as item } from "@/app/api/family/item/route";
import { PATCH as settings } from "@/app/api/family/settings/route";
import { POST as calendarCheck } from "@/app/api/family/calendar-check/route";
import { __resetFrameForTest, addNote, addPhoto, getFrame } from "@/lib/frame/store";
import { getSettings, saveSettings, defaultSettings } from "@/lib/family/settings";
import { __setBindingsForTest } from "@/lib/cloudflare/bindings";

const req = (method: string, url: string, body?: unknown) =>
  new Request(`https://cv.example${url}`, { method, body: body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body) });

beforeEach(async () => { await __resetFrameForTest(); await saveSettings(defaultSettings()); });
afterEach(() => __setBindingsForTest(null));

describe("GET /api/family", () => {
  it("returns photos, messages, bin, log and settings", async () => {
    await addPhoto({ url: "/a.jpg", from: "Kate" });
    await addNote({ text: "hi", from: "Tom" });
    const body = await (await family()).json();
    expect(body.photos).toHaveLength(1);
    expect(body.notes).toHaveLength(1);
    expect(body.trash).toEqual([]);
    expect(body.log.map((e: { from: string }) => e.from)).toEqual(["Tom", "Kate"]);
    expect(body.settings).toEqual(await getSettings());
    expect(body).toHaveProperty("frameLastSeen");
  });

  it("never sends WhatsApp numbers to the browser", async () => {
    await addPhoto({ url: "/a.jpg", from: "Kate", waFrom: "447700900000", waMessageId: "wamid.x" });
    const text = await (await family()).text();
    expect(text).not.toContain("447700900000");
    expect(text).not.toContain("wamid.x");
  });
});

describe("POST /api/family/item", () => {
  it("hides, deletes and restores", async () => {
    const p = await addPhoto({ url: "/a.jpg", from: "Kate" });
    expect((await item(req("POST", "/api/family/item", { action: "hide", kind: "photo", id: p.id }))).status).toBe(200);
    expect((await getFrame()).photos).toEqual([]);
    await item(req("POST", "/api/family/item", { action: "show", kind: "photo", id: p.id }));
    expect((await getFrame()).photos).toHaveLength(1);
    await item(req("POST", "/api/family/item", { action: "delete", kind: "photo", id: p.id }));
    expect((await getFrame()).photos).toEqual([]);
    await item(req("POST", "/api/family/item", { action: "restore", kind: "photo", id: p.id }));
    expect((await getFrame()).photos).toHaveLength(1);
  });

  it("names who sent a photo", async () => {
    const p = await addPhoto({ url: "/a.jpg", from: "" });
    expect((await item(req("POST", "/api/family/item", { action: "setFrom", kind: "photo", id: p.id, from: "Tom" }))).status).toBe(200);
    expect((await getFrame()).photos[0].from).toBe("Tom");
    expect((await item(req("POST", "/api/family/item", { action: "setFrom", kind: "photo", id: p.id, from: 7 }))).status).toBe(400);
  });

  it("rejects nonsense and unknown ids", async () => {
    expect((await item(req("POST", "/api/family/item", "{bad"))).status).toBe(400);
    expect((await item(req("POST", "/api/family/item", { action: "explode", kind: "photo", id: "x" }))).status).toBe(400);
    expect((await item(req("POST", "/api/family/item", { action: "hide", kind: "note", id: "x" }))).status).toBe(400);
    expect((await item(req("POST", "/api/family/item", { action: "delete", kind: "photo", id: "nope" }))).status).toBe(404);
  });
});

describe("PATCH /api/family/settings", () => {
  it("merges just what changed, so two people editing don't undo each other", async () => {
    await settings(req("PATCH", "/api/family/settings", { addCalendar: { name: "Mum", url: "https://cal.example/m.ics", color: "#B0607A" } }));
    const res = await settings(req("PATCH", "/api/family/settings", { photoSlideSec: 45, nightStartHour: 99 }));
    const saved = await res.json();
    expect(saved.photoSlideSec).toBe(45);
    expect(saved.nightStartHour).toBe(23);
    expect(saved.calendars.map((c: { name: string }) => c.name)).toEqual(["Mum"]);
    expect(await getSettings()).toEqual(saved);
  });

  it("rejects a body that isn't JSON", async () => {
    expect((await settings(req("PATCH", "/api/family/settings", "{bad"))).status).toBe(400);
  });
});

describe("POST /api/family/calendar-check", () => {
  it("explains a bad link without fetching anything", async () => {
    const body = await (await calendarCheck(req("POST", "/api/family/calendar-check", { url: "ftp://x" }))).json();
    expect(body.ok).toBe(false);
    expect(body.error).toMatch(/https:\/\/ or webcal:\/\//);
  });
});
