import { describe, it, expect, afterEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { middleware } from "@/middleware";
import { adminCookie, householdCookie } from "@/lib/households/session";

const KEY = "frame-key-for-tests-0123456789";
const SECRET = "session-secret-for-tests";

function req(path: string, headers: Record<string, string> = {}) {
  return new NextRequest(`https://cv.example${path}`, { headers });
}
const through = (res: Response) => res.status === 200 && res.headers.get("location") === null;

afterEach(() => vi.unstubAllEnvs());

describe("middleware", () => {
  const gate = () => { vi.stubEnv("SITE_PIN", "1234"); vi.stubEnv("FRAME_KEY", KEY); vi.stubEnv("SESSION_SECRET", SECRET); vi.stubEnv("ADMIN_PIN", "99999999"); };

  it("hands a frame's key on frame paths to the route (which checks it against the household's frames)", async () => {
    gate();
    expect(through(await middleware(req("/api/kitchen/feed", { authorization: `Bearer ${KEY}` })))).toBe(true);
    expect(through(await middleware(req("/api/kitchen/feed", { authorization: "Bearer some-other-households-key" })))).toBe(true);
  });

  it("still sends PIN-only paths to /unlock even with a frame key", async () => {
    gate();
    expect((await middleware(req("/api/kitchen/command", { authorization: `Bearer ${KEY}` }))).headers.get("location")).toContain("/unlock");
  });

  it("sends a browser with nothing to /unlock", async () => {
    gate();
    expect((await middleware(req("/family"))).headers.get("location")).toContain("/unlock");
  });

  it("keeps the parents' original PIN cookie working", async () => {
    gate();
    expect(through(await middleware(req("/kitchen", { cookie: "cv_session=1234" })))).toBe(true);
  });

  it("lets a signed household cookie through, not a forged one", async () => {
    gate();
    const c = await householdCookie("bristol", "ab12", SECRET);
    expect(through(await middleware(req("/family", { cookie: `cv_h=${c}` })))).toBe(true);
    expect(through(await middleware(req("/family", { cookie: `cv_h=${c.replace("bristol", "ludlow")}` })))).toBe(false);
  });

  it("lets the admin through", async () => {
    gate();
    expect(through(await middleware(req("/family", { cookie: `cv_admin=${await adminCookie(SECRET, "99999999")}` })))).toBe(true);
  });

  it("is open when no gate is configured (local dev)", async () => {
    expect(through(await middleware(req("/family")))).toBe(true);
  });
});
