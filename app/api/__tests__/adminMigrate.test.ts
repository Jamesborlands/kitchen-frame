import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { testDb } from "@/lib/db/testing";
import { __setDbForTest } from "@/lib/db/d1";
import { __setBindingsForTest } from "@/lib/cloudflare/bindings";
import { hasD1 } from "@/lib/households/data";
import { adminCookie, householdCookie } from "@/lib/households/session";
import { POST } from "@/app/api/admin/migrate/route";

beforeEach(() => {
  __setDbForTest(testDb());
  vi.stubEnv("SESSION_SECRET", "s");
  vi.stubEnv("SITE_PIN", "1234");
  vi.stubEnv("FRAME_KEY", "k");
  vi.stubEnv("ADMIN_PIN", "99999999");
});
afterEach(() => { vi.unstubAllEnvs(); __setBindingsForTest(null); });

const post = (cookie: string) => POST(new Request("https://cv.example/api/admin/migrate", { method: "POST", headers: { cookie } }));

describe("POST /api/admin/migrate", () => {
  it("only for the admin", async () => {
    expect((await post("cv_session=1234")).status).toBe(403);
    expect((await post(`cv_h=${await householdCookie("ludlow", "ab12", "s")}`)).status).toBe(403);
  });

  it("moves the parents' records and reports what it moved", async () => {
    const res = await post(`cv_admin=${await adminCookie("s", "99999999")}`);
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true, photos: expect.any(Number) });
  });
});

describe("the D1 switch", () => {
  it("is off until HOUSEHOLDS_STORE=d1, even with D1 bound", () => {
    __setBindingsForTest({ DB: {} } as never);
    expect(hasD1()).toBe(false);
    vi.stubEnv("HOUSEHOLDS_STORE", "d1");
    expect(hasD1()).toBe(true);
  });
});
