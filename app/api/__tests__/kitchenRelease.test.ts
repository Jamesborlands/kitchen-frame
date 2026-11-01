import { describe, it, expect, afterEach } from "vitest";
import { GET as release } from "@/app/api/kitchen/release/route";
import { GET as apk } from "@/app/api/kitchen/release/apk/route";
import { __setBindingsForTest, type R2Like } from "@/lib/cloudflare/bindings";

const rel = { versionCode: 4, versionName: "1.0.4", sha256: "b".repeat(64), sizeBytes: 3, minVersionCode: 1 };

function r2(files: Record<string, BodyInit>): R2Like {
  return {
    put: async () => {},
    get: async (k) => (k in files ? { body: new Response(files[k]).body! } : null),
  };
}

afterEach(() => __setBindingsForTest(null));

describe("release endpoints", () => {
  it("serves release.json and the matching APK", async () => {
    __setBindingsForTest({ PHOTOS: r2({ "frame-app/release.json": JSON.stringify(rel), "frame-app/4.apk": new Uint8Array([9, 8, 7]) }) });
    const r = await release();
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual(rel);
    const a = await apk();
    expect(a.status).toBe(200);
    expect(a.headers.get("content-type")).toBe("application/vnd.android.package-archive");
    expect(new Uint8Array(await a.arrayBuffer())).toEqual(new Uint8Array([9, 8, 7]));
  });

  it("404s with no release, a corrupt release.json, or a missing APK", async () => {
    __setBindingsForTest({ PHOTOS: r2({}) });
    expect((await release()).status).toBe(404);
    __setBindingsForTest({ PHOTOS: r2({ "frame-app/release.json": "{oops" }) });
    expect((await release()).status).toBe(404);
    __setBindingsForTest({ PHOTOS: r2({ "frame-app/release.json": JSON.stringify(rel) }) });
    expect((await apk()).status).toBe(404);
    __setBindingsForTest({});
    expect((await release()).status).toBe(404);
  });
});
