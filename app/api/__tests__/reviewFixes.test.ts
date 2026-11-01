import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { testDb } from "@/lib/db/testing";
import { __setDbForTest } from "@/lib/db/d1";
import { __useD1ForTest } from "@/lib/households/data";
import { addFrame, createHousehold, setPin, householdPinVersion } from "@/lib/households/repo";
import { LUDLOW_DEFAULTS } from "@/lib/households/defaults";
import { adminCookie, householdCookie } from "@/lib/households/session";
import { householdForRequest } from "@/lib/households/request";
import { __resetThrottleForTest } from "@/lib/households/throttle";
import { middleware } from "@/middleware";
import { POST as unlock } from "@/app/api/unlock/route";

const SECRET = "s";
const cookieFor = async (id: string) => `cv_h=${await householdCookie(id, (await householdPinVersion(id))!, SECRET)}`;
const req = (headers: Record<string, string>, path = "/api/family") => new Request(`https://cv.example${path}`, { headers });

beforeEach(async () => {
  __setDbForTest(testDb());
  __useD1ForTest(true);
  __resetThrottleForTest();
  vi.stubEnv("SESSION_SECRET", SECRET);
  vi.stubEnv("SITE_PIN", "1234");
  vi.stubEnv("ADMIN_PIN", "99999999");
  vi.stubEnv("FRAME_KEY", "parents-key");
  for (const id of ["ludlow", "bristol"]) await createHousehold({ id, name: id, settings: LUDLOW_DEFAULTS() }, 1);
  await setPin("bristol", "555555", SECRET);
  await addFrame("bristol", "bristol-key", "kitchen", 1);
});
afterEach(() => { __useD1ForTest(null); vi.unstubAllEnvs(); });

describe("with D1 switched off (the documented undo), only the parents resolve", () => {
  it("another household's cookie or frame key gets no one", async () => {
    const c = await cookieFor("bristol");
    __useD1ForTest(false);
    expect(await householdForRequest(req({ cookie: c }))).toBeNull();
    expect(await householdForRequest(req({ authorization: "Bearer bristol-key" }))).toBeNull();
    expect(await householdForRequest(req({ authorization: "Bearer parents-key" }))).toEqual({ id: "ludlow", via: "frame" });
  });
});

describe("resetting a PIN signs out old phones", () => {
  it("an old cookie stops working once the PIN changes", async () => {
    const old = await cookieFor("bristol");
    expect(await householdForRequest(req({ cookie: old }))).toEqual({ id: "bristol", via: "pin" });
    await setPin("bristol", "666666", SECRET);
    expect(await householdForRequest(req({ cookie: old }))).toBeNull();
  });

  it("an admin cookie stops working once ADMIN_PIN changes", async () => {
    const c = `cv_admin=${await adminCookie(SECRET, "99999999")}`;
    expect((await householdForRequest(req({ cookie: c })))?.via).toBe("admin");
    vi.stubEnv("ADMIN_PIN", "88888888");
    expect(await householdForRequest(req({ cookie: c }))).toBeNull();
  });

  it("a malformed cookie is no one, not a crash", async () => {
    expect(await householdForRequest(req({ cookie: "cv_h=%E0%A4%A" }))).toBeNull();
  });
});

describe("another household only gets into its own pages", () => {
  const through = (r: Response) => r.status === 200 && r.headers.get("location") === null;
  it("/family yes; the parents' dashboard and calendar no", async () => {
    const c = await cookieFor("bristol");
    const mw = (path: string) => middleware(new NextRequest(`https://cv.example${path}`, { headers: { cookie: c } }));
    expect(through(await mw("/family"))).toBe(true);
    expect(through(await mw("/api/family/todos"))).toBe(true);
    expect(through(await mw("/api/photo"))).toBe(true);
    expect(through(await mw("/api/calendar"))).toBe(false);
    expect(through(await mw("/calendar"))).toBe(false);
    expect(through(await mw("/"))).toBe(false);
  });

  it("the parents' own cookie still gets everywhere", async () => {
    const mw = (path: string) => middleware(new NextRequest(`https://cv.example${path}`, { headers: { cookie: "cv_session=1234" } }));
    expect(through(await mw("/api/calendar"))).toBe(true);
    expect(through(await mw("/"))).toBe(true);
  });
});

describe("PIN guessing", () => {
  const tryPin = (pin: string, ip = "203.0.113.9") => unlock(new Request("https://cv.example/api/unlock", {
    method: "POST", headers: { "cf-connecting-ip": ip }, body: JSON.stringify({ pin }),
  }));
  it("ten wrong PINs from one address, then even the right one waits", async () => {
    for (let i = 0; i < 10; i++) expect((await tryPin(`00000${i}`)).status).toBe(401);
    expect((await tryPin("555555")).status).toBe(429);
    expect((await tryPin("555555", "198.51.100.7")).status).toBe(200); // another address is fine
  });
});
