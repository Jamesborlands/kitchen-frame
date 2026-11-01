import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { POST as unlock } from "@/app/api/unlock/route";
import { testDb } from "@/lib/db/testing";
import { __setDbForTest } from "@/lib/db/d1";
import { createHousehold, setPin } from "@/lib/households/repo";
import { LUDLOW_DEFAULTS } from "@/lib/households/defaults";
import { readAdmin, readHousehold } from "@/lib/households/session";

const SECRET = "s3cret";
const post = (pin: string) => unlock(new Request("https://cv.example/api/unlock", { method: "POST", body: JSON.stringify({ pin }) }));
const cookieValue = (res: Response, name: string) => {
  const m = (res.headers.get("set-cookie") ?? "").match(new RegExp(`${name}=([^;]+)`));
  return m ? decodeURIComponent(m[1]) : undefined;
};

beforeEach(async () => {
  __setDbForTest(testDb());
  vi.stubEnv("SESSION_SECRET", SECRET);
  vi.stubEnv("SITE_PIN", "1234");
  vi.stubEnv("ADMIN_PIN", "999999");
  await createHousehold({ id: "bristol", name: "Sophie", settings: LUDLOW_DEFAULTS() }, 1);
  await setPin("bristol", "5555", SECRET);
});
afterEach(() => vi.unstubAllEnvs());

describe("POST /api/unlock", () => {
  it("a household's PIN signs that household in", async () => {
    const res = await post("5555");
    expect(res.status).toBe(200);
    expect((await readHousehold(cookieValue(res, "cv_h"), SECRET))?.id).toBe("bristol");
  });

  it("the parents' original PIN still works", async () => {
    const res = await post("1234");
    expect(res.status).toBe(200);
    expect(cookieValue(res, "cv_session")).toBe("1234");
  });

  it("the admin PIN gives the admin cookie", async () => {
    const res = await post("999999");
    expect(await readAdmin(cookieValue(res, "cv_admin"), SECRET, "999999")).toBe(true);
  });

  it("a wrong PIN gets nothing", async () => {
    const res = await post("0000");
    expect(res.status).toBe(401);
    expect(res.headers.get("set-cookie")).toBeNull();
  });
});
