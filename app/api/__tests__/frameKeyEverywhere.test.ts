import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { testDb } from "@/lib/db/testing";
import { __setDbForTest } from "@/lib/db/d1";
import { FRAME_KEY_PATHS } from "@/lib/kitchen/frameKey";

// The middleware lets any Bearer through on frame paths and leaves the check to
// the route — so every one of them must turn an unknown key away.
beforeEach(() => {
  __setDbForTest(testDb());
  vi.stubEnv("FRAME_KEY", "the-real-key");
  vi.stubEnv("SITE_PIN", "1234");
  vi.stubEnv("SESSION_SECRET", "s");
});
afterEach(() => vi.unstubAllEnvs());

describe("every frame route checks the key", () => {
  for (const path of FRAME_KEY_PATHS) {
    it(path, async () => {
      const mod = (await import(`@/app${path}/route`)) as Record<string, (r: Request) => Promise<Response>>;
      for (const method of ["GET", "POST"].filter((m) => typeof mod[m] === "function")) {
        const res = await mod[method](new Request(`https://cv.example${path}?k=whatsapp/x.jpg&kind=logs`, {
          method, headers: { authorization: "Bearer made-up-key", "content-type": "application/json" },
          body: method === "POST" ? "{}" : undefined,
        }));
        expect(`${method} ${res.status}`).toBe(`${method} 401`);
      }
    });
  }
});
