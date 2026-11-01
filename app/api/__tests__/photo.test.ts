import { describe, it, expect, afterEach } from "vitest";
import { GET } from "@/app/api/photo/route";
import { __setBindingsForTest } from "@/lib/cloudflare/bindings";

afterEach(() => __setBindingsForTest(null));

function req(k?: string) {
  return new Request(k ? `https://site/api/photo?k=${encodeURIComponent(k)}` : "https://site/api/photo");
}

function bucketWith(objects: Record<string, string>) {
  return {
    put: async () => undefined,
    get: async (key: string) =>
      key in objects ? { body: new Response(objects[key]).body!, httpMetadata: { contentType: "image/png" } } : null,
  };
}

describe("GET /api/photo", () => {
  it("400 when no key", async () => {
    expect((await GET(req())).status).toBe(400);
  });
  it("403 for keys outside the photo folder", async () => {
    expect((await GET(req("../secrets"))).status).toBe(403);
    expect((await GET(req("incremental-cache/x"))).status).toBe(403);
  });
  it("502 when the bucket isn't bound", async () => {
    expect((await GET(req("whatsapp/x.jpg"))).status).toBe(502);
  });
  it("404 for a missing photo", async () => {
    __setBindingsForTest({ PHOTOS: bucketWith({}) });
    expect((await GET(req("whatsapp/x.jpg"))).status).toBe(404);
  });
  it("streams a stored photo with its content-type", async () => {
    __setBindingsForTest({ PHOTOS: bucketWith({ "whatsapp/x.png": "png-bytes" }) });
    const res = await GET(req("whatsapp/x.png"));
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("image/png");
    expect(await res.text()).toBe("png-bytes");
  });
});
