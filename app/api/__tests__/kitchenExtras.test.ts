import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { __setBindingsForTest } from "@/lib/cloudflare/bindings";
import { householdTodos } from "@/lib/households/data";
import { saveSettings, defaultSettings } from "@/lib/family/settings";
import { POST as addTodo } from "@/app/api/kitchen/todos/add/route";
import { GET as calendar } from "@/app/api/kitchen/calendar/route";
import { GET as route } from "@/app/api/kitchen/route/route";
import { GET as tile } from "@/app/api/kitchen/tile/route";
import { buildRange } from "@/lib/kitchen/feed/today";

const get = (path: string) => new Request(`https://cv.example${path}`);
const post = (path: string, body: unknown) => new Request(`https://cv.example${path}`, { method: "POST", body: JSON.stringify(body) });

function bucket() {
  const m = new Map<string, { bytes: ArrayBuffer; type: string }>();
  return {
    m,
    put: async (k: string, v: ArrayBuffer | string, o?: { httpMetadata?: { contentType?: string } }) => {
      m.set(k, { bytes: typeof v === "string" ? new TextEncoder().encode(v).buffer as ArrayBuffer : v, type: o?.httpMetadata?.contentType ?? "" });
    },
    get: async (k: string) => {
      const e = m.get(k);
      return e ? { body: new Response(e.bytes).body!, httpMetadata: { contentType: e.type }, text: async () => new TextDecoder().decode(e.bytes) } : null;
    },
  };
}

afterEach(() => { vi.unstubAllGlobals(); __setBindingsForTest(null); });

describe("adding a to-do from the frame", () => {
  it("adds it to the household's list; blank is refused", async () => {
    expect((await addTodo(post("/api/kitchen/todos/add", { text: "Buy milk" }))).status).toBe(200);
    expect((await householdTodos("ludlow").list()).map((t) => t.text)).toContain("Buy milk");
    expect((await addTodo(post("/api/kitchen/todos/add", { text: "   " }))).status).toBe(400);
  });
});

describe("the calendar for any stretch of days", () => {
  it("every day in the range, with everything on it (earlier today too)", () => {
    const days = buildRange({
      from: "2026-10-01", days: 42, timeZone: "Europe/London",
      reminders: [{ id: "r", text: "Bins", time: null, color: "#5E7E5E", repeat: { kind: "weekly", days: [4], everyWeeks: 1, from: "2026-10-01" } }],
      occasions: [{ name: "Gran", day: 12, month: 10, kind: "birthday" }], calendar: [],
    });
    expect(days).toHaveLength(42);
    expect(days[0].date).toBe("2026-10-01");
    expect(days[41].date).toBe("2026-11-11");
    expect(days.find((d) => d.date === "2026-10-12")!.items.map((i) => i.text)).toEqual(["Gran's birthday"]);
    expect(days.filter((d) => d.items.some((i) => i.text === "Bins")).map((d) => d.date)).toEqual(["2026-10-01", "2026-10-08", "2026-10-15", "2026-10-22", "2026-10-29", "2026-11-05"]);
  });

  it("GET /api/kitchen/calendar?from=&days= — capped at 42 days, bad dates refused", async () => {
    await saveSettings({ ...defaultSettings(), calendars: [], occasions: [{ name: "Gran", day: 12, month: 10, kind: "birthday" }] });
    const r = await calendar(get("/api/kitchen/calendar?from=2026-10-01&days=99"));
    const body = (await r.json()) as { days: { date: string; items: { text: string }[] }[] };
    expect(body.days).toHaveLength(42);
    expect(body.days[11].items[0].text).toBe("Gran's birthday");
    expect((await calendar(get("/api/kitchen/calendar?from=nope&days=7"))).status).toBe(400);
  });
});

describe("a ride's route for the map", () => {
  beforeEach(() => {
    const b = bucket();
    __setBindingsForTest({ PHOTOS: b } as never);
  });

  it("fetched once from BRouter, thinned, with its length and climb; then kept", async () => {
    const coords = Array.from({ length: 2000 }, (_, i) => [-2.72 + i * 1e-5, 52.37 + i * 1e-5, 50]);
    const fetchMock = vi.fn(async () => Response.json({ features: [{ geometry: { coordinates: coords }, properties: { "track-length": "12345", "filtered ascend": "210" } }] }));
    vi.stubGlobal("fetch", fetchMock);
    const a = (await (await route(get("/api/kitchen/route?id=0"))).json()) as { name: string; distanceKm: number; ascentM: number; points: number[][]; bbox: number[] };
    expect(a.name).toBe("Ludlow town circular");
    expect(a.distanceKm).toBe(12.3);
    expect(a.ascentM).toBe(210);
    expect(a.points.length).toBeLessThanOrEqual(400);
    expect(a.points[0]).toEqual([52.37, -2.72]);
    expect(a.bbox).toEqual([52.37, -2.72, expect.closeTo(52.38999, 4), expect.closeTo(-2.70001, 4)]);
    await route(get("/api/kitchen/route?id=0"));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect((await route(get("/api/kitchen/route?id=99"))).status).toBe(404);
  });
});

describe("map tiles", () => {
  beforeEach(() => { __setBindingsForTest({ PHOTOS: bucket() } as never); });

  it("passed through once from OpenStreetMap, then served from storage", async () => {
    const fetchMock = vi.fn(async () => new Response(new Uint8Array([137, 80, 78, 71]), { headers: { "content-type": "image/png" } }));
    vi.stubGlobal("fetch", fetchMock);
    const r = await tile(get("/api/kitchen/tile?z=13&x=4055&y=2734"));
    expect(r.status).toBe(200);
    expect(r.headers.get("content-type")).toBe("image/png");
    expect(String((fetchMock.mock.calls[0] as unknown[])[0])).toBe("https://tile.openstreetmap.org/13/4055/2734.png");
    await tile(get("/api/kitchen/tile?z=13&x=4055&y=2734"));
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("refuses silly coordinates", async () => {
    expect((await tile(get("/api/kitchen/tile?z=19&x=1&y=1"))).status).toBe(400);
    expect((await tile(get("/api/kitchen/tile?z=5&x=40&y=1"))).status).toBe(400);
  });
});

describe("the feed carries the Settings panel's link, QR and number", () => {
  it("the family page on this site, as a QR code", async () => {
    vi.stubGlobal("fetch", async () => new Response("offline", { status: 503 }));
    const { GET: feed } = await import("@/app/api/kitchen/feed/route");
    const f = (await (await feed(get("/api/kitchen/feed"))).json()) as { share: { url: string; qr: string[]; whatsapp: string | null } };
    expect(f.share.url).toBe("https://cv.example/family");
    expect(f.share.qr.length).toBeGreaterThanOrEqual(21);
  });
});

describe("anything new? — the frame's cheap 10-second check", () => {
  it("matches the feed's marker, and changes the moment a photo or message arrives", async () => {
    vi.stubGlobal("fetch", async () => new Response("offline", { status: 503 }));
    const { GET: latest } = await import("@/app/api/kitchen/latest/route");
    const { GET: feed } = await import("@/app/api/kitchen/feed/route");
    const { frameStore } = await import("@/lib/households/data");
    const mark = async () => ((await (await latest(get("/api/kitchen/latest"))).json()) as { latest: string }).latest;
    const before = await mark();
    expect(((await (await feed(get("/api/kitchen/feed"))).json()) as { latest: string }).latest).toBe(before);
    await frameStore("ludlow").addNote({ text: "new!", from: "Sam Hart" });
    expect(await mark()).not.toBe(before);
  });
});
