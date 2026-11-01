import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { testDb } from "@/lib/db/testing";
import { __setDbForTest } from "@/lib/db/d1";
import { adminCookie } from "@/lib/households/session";
import { getHousehold, householdForFrameKey, householdForPin, householdForPhoneNumberId } from "@/lib/households/repo";
import { POST } from "@/app/api/admin/households/route";

beforeEach(() => { __setDbForTest(testDb()); vi.stubEnv("SESSION_SECRET", "s"); vi.stubEnv("ADMIN_PIN", "99999999"); });
afterEach(() => vi.unstubAllEnvs());

const call = async (body: unknown, admin = true) => {
  const res = await POST(new Request("https://cv.example/api/admin/households", {
    method: "POST",
    headers: { cookie: admin ? `cv_admin=${await adminCookie("s", "99999999")}` : "cv_session=nope", "content-type": "application/json" },
    body: JSON.stringify(body),
  }));
  return { status: res.status, body: (await res.json()) as Record<string, unknown> };
};
const HOME = { label: "Bristol", latitude: 51.45, longitude: -2.59, timezone: "Europe/London" };

describe("POST /api/admin/households", () => {
  it("admin only", async () => {
    expect((await call({ action: "list" }, false)).status).toBe(403);
  });

  it("new: a household with its home, a fresh PIN and frame key (returned once)", async () => {
    const r = await call({ action: "new", id: "bristol", name: "Sophie's", home: HOME });
    expect(r.status).toBe(200);
    expect(r.body.pin).toMatch(/^\d{6}$/);
    expect(String(r.body.frameKey).length).toBeGreaterThanOrEqual(32);
    expect(await householdForPin(String(r.body.pin), "s")).toBe("bristol");
    expect(await householdForFrameKey(String(r.body.frameKey))).toBe("bristol");
    expect((await getHousehold("bristol"))?.settings.home.label).toBe("Bristol");
    expect((await call({ action: "list" })).body.households).toEqual([{ id: "bristol", name: "Sophie's" }]);
  });

  it("set-whatsapp, reset-pin, add-frame; bad input is refused", async () => {
    await call({ action: "new", id: "bristol", name: "Sophie's", home: HOME });
    expect((await call({ action: "set-whatsapp", id: "bristol", phoneNumberId: "123456789" })).status).toBe(200);
    expect(await householdForPhoneNumberId("123456789")).toBe("bristol");
    const pin = String((await call({ action: "reset-pin", id: "bristol" })).body.pin);
    expect(await householdForPin(pin, "s")).toBe("bristol");
    const key = String((await call({ action: "add-frame", id: "bristol", label: "lounge" })).body.frameKey);
    expect(await householdForFrameKey(key)).toBe("bristol");
    expect((await call({ action: "new", id: "Bad Id!", name: "x", home: HOME })).status).toBe(400);
    expect((await call({ action: "reset-pin", id: "nobody" })).status).toBe(404);
  });
});

describe("a new PIN", () => {
  it("is never the admin PIN or the parents' PIN", async () => {
    const { pickPin } = await import("@/app/api/admin/households/route");
    const rolls = ["99999999", "1234", "482913"];
    expect(pickPin(() => rolls.shift()!, ["99999999", "1234"])).toBe("482913");
  });
});

