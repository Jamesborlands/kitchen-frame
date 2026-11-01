import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { testDb } from "@/lib/db/testing";
import { __setDbForTest } from "@/lib/db/d1";
import { adminCookie, householdCookie, readAdmin, readHousehold } from "@/lib/households/session";
import { householdForRequest } from "@/lib/households/request";
import { addFrame, createHousehold, householdPinVersion, setPin } from "@/lib/households/repo";
import { __useD1ForTest } from "@/lib/households/data";
import { LUDLOW_DEFAULTS } from "@/lib/households/defaults";

const SECRET = "s3cret-for-tests";

describe("signed household cookies", () => {
  it("round-trips, and a forged or altered one is refused", async () => {
    const c = await householdCookie("bristol", "abc123", SECRET);
    expect(await readHousehold(c, SECRET)).toEqual({ id: "bristol", version: "abc123" });
    expect(await readHousehold(c.replace("bristol", "ludlow"), SECRET)).toBeNull();
    expect(await readHousehold(c.replace("abc123", "abc124"), SECRET)).toBeNull();
    expect(await readHousehold("bristol.abc", SECRET)).toBeNull();
    expect(await readHousehold(c, "another-secret")).toBeNull();
    expect(await readHousehold(undefined, SECRET)).toBeNull();
  });

  it("admin cookie", async () => {
    expect(await readAdmin(await adminCookie(SECRET, "12345678"), SECRET, "12345678")).toBe(true);
    expect(await readAdmin(await adminCookie(SECRET, "12345678"), SECRET, undefined)).toBe(false);
    expect(await readAdmin(await householdCookie("admin", "1", SECRET), SECRET, "12345678")).toBe(false);
  });
});

describe("householdForRequest", () => {
  beforeEach(async () => {
    __setDbForTest(testDb());
    __useD1ForTest(true);
    vi.stubEnv("SESSION_SECRET", SECRET);
    vi.stubEnv("ADMIN_PIN", "99999999");
    vi.stubEnv("SITE_PIN", "1234");
    vi.stubEnv("FRAME_KEY", "legacy-frame-key");
    await createHousehold({ id: "ludlow", name: "Anne & Peter", settings: LUDLOW_DEFAULTS() }, 1);
    await createHousehold({ id: "bristol", name: "Sophie", settings: LUDLOW_DEFAULTS() }, 1);
    await addFrame("bristol", "bristol-frame-key", "kitchen", 1);
    await setPin("bristol", "555555", SECRET);
  });
  afterEach(() => { __useD1ForTest(null); vi.unstubAllEnvs(); });

  const req = (headers: Record<string, string>) => new Request("https://cv.example/api/kitchen/feed", { headers });

  it("a frame key → its household; the parents' original key → ludlow; unknown → no one", async () => {
    expect(await householdForRequest(req({ authorization: "Bearer bristol-frame-key" }))).toEqual({ id: "bristol", via: "frame" });
    expect(await householdForRequest(req({ authorization: "Bearer legacy-frame-key" }))).toEqual({ id: "ludlow", via: "frame" });
    expect(await householdForRequest(req({ authorization: "Bearer nope" }))).toBeNull();
  });

  it("a household cookie, the parents' original PIN cookie, and the admin's pick", async () => {
    expect(await householdForRequest(req({ cookie: `cv_h=${await householdCookie("bristol", (await householdPinVersion("bristol"))!, SECRET)}` }))).toEqual({ id: "bristol", via: "pin" });
    expect(await householdForRequest(req({ cookie: "cv_session=1234" }))).toEqual({ id: "ludlow", via: "pin" });
    expect(await householdForRequest(req({ cookie: `cv_admin=${await adminCookie(SECRET, "99999999")}; cv_pick=bristol` }))).toEqual({ id: "bristol", via: "admin" });
    expect(await householdForRequest(req({ cookie: `cv_admin=${await adminCookie(SECRET, "99999999")}` }))).toEqual({ id: "ludlow", via: "admin" });
    expect(await householdForRequest(req({ cookie: "cv_session=wrong" }))).toBeNull();
  });
});
