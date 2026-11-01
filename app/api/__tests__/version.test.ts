import { describe, it, expect, afterEach, vi } from "vitest";
import { GET } from "@/app/api/version/route";

afterEach(() => vi.unstubAllEnvs());

describe("GET /api/version", () => {
  it("reports the deployed commit", async () => {
    vi.stubEnv("APP_VERSION", "abc123");
    expect(await (await GET()).json()).toEqual({ version: "abc123" });
  });
  it("is null when the build had no commit sha", async () => {
    vi.stubEnv("APP_VERSION", "");
    delete process.env.APP_VERSION;
    expect(await (await GET()).json()).toEqual({ version: null });
  });
});
